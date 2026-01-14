import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { VnpayService } from 'nestjs-vnpay';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { InstallationRequest } from '../iot/entities/installation-request.entity';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { ReturnQueryFromVNPay, ProductCode, VnpLocale } from 'vnpay';
import { SubscriptionPlanService } from './subscription-plan.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly vnpayService: VnpayService,
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(InstallationRequest)
    private readonly installationRequestRepository: Repository<InstallationRequest>,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly subscriptionPlanService: SubscriptionPlanService,
  ) {}

  async createSubscriptionPaymentUrl(
    userId: string, 
    ipAddr: string,
    planCode: string
  ): Promise<string> {
    // 1. Fetch plan from database
    const plan = await this.subscriptionPlanService.findByCode(planCode);
    if (!plan.isActive) {
      throw new BadRequestException('Gói đăng ký này đã ngừng cung cấp');
    }

    // 2. CHECK ĐÃ LẮP IOT
    const hasHardware = await this.installationRequestRepository.findOne({
      where: {
        farmerId: userId,
        status: 'COMPLETED' as any, // InstallationRequestStatus.COMPLETED
      },
    });

    if (!hasHardware) {
      throw new ForbiddenException('Vui lòng lắp đặt thiết bị phần cứng trước khi đăng ký gói Premium.');
    }

    // 3. Get amount from plan (dynamic pricing)
    const amount = Number(plan.price);
    const locale: VnpLocale = VnpLocale.VN;

    // 4. Create transaction with plan reference
    const transaction = this.transactionRepository.create({
      userId,
      amount,
      status: 'PENDING',
      type: 'SUBSCRIPTION',
      planCode: plan.code,
      subscriptionPlanId: plan.id,
    });
    await this.transactionRepository.save(transaction);
    
    // Use the transaction ID as the vnp_TxnRef
    const txnRef = transaction.id; 
    transaction.vnpayTxnRef = txnRef;
    await this.transactionRepository.save(transaction);

    // 5. Build VNPAY payment URL
    // bản chất nó thực hiện thuật toán ký số HMAC-SHA512. Quy tắc quan trọng nhất là phải Sắp xếp tham số theo Alphabet trước khi Ký
    // , để đảm bảo tính nhất quán (Consistency) của dữ liệu."
    const paymentUrl = this.vnpayService.buildPaymentUrl({
      vnp_Amount: amount, // Library handles multiplication by 100 ___amount truyền từ gói cước
      vnp_IpAddr: ipAddr === '::1' ? '127.0.0.1' : ipAddr, // địa chỉ ip của khách hàng thực hiện giao dịch
      vnp_TxnRef: txnRef, // là payment_transactions.__id, mã tham chiếu của giao dịch tại hệ thống của merchant, mã là duy nhất để phân biệt các đơn hàng gửi sang VNPAY, ko trùng lặp trong ngày
      vnp_OrderInfo: `Thanh toan ${plan.name} cho user ${userId}`, // ___string mô tả thôi , TV ko dấu
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: this.configService.getOrThrow('VNPAY_RETURN_URL'),  // http://localhost:3000/payment/vnpay-return, URL thông báo kết quả giao dịch khi khách hàng kết thúc thanh toán
      vnp_Locale: locale, // ngôn ngữ giao diện hiển thị
    });
    
    this.logger.log(`[VNPAY_createSubscriptionPaymentUrl] Generated VNPAY URL for plan ${plan.code}: ${paymentUrl}`);
    // url chứa thông tin số tiền, mã đơn hàng, đbiệt là chữ ký bảo mật Checksum(HMAC-SHA512)
    return paymentUrl;
  }

  async handleCallback(query: ReturnQueryFromVNPay) {
    // Phương thức xác thực tính đúng đắn của các tham số trả về từ VNPay
    const isValid = this.vnpayService.verifyReturnUrl(query);
    if (!isValid) {
      throw new BadRequestException('Invalid checksum');
    }

    const { vnp_TxnRef, vnp_TransactionNo, vnp_ResponseCode, vnp_BankCode, vnp_PayDate } = query;

    this.logger.log(`Processing VNPAY callback for txn ${vnp_TxnRef}, ResponseCode=${vnp_ResponseCode}`);

    const transaction = await this.transactionRepository.findOne({ where: { vnpayTxnRef: vnp_TxnRef as string } });
    if (!transaction) {
      this.logger.error(`Transaction not found: ${vnp_TxnRef}`);
      return { success: false, message: 'Transaction not found' };
    }

    // Update transaction with response details
    transaction.vnpayTransactionNo = vnp_TransactionNo as string;
    transaction.bankCode = vnp_BankCode as string;
    transaction.payDate = vnp_PayDate as string;
    transaction.vnpayResponse = JSON.stringify(query);

    // Check success
    if (vnp_ResponseCode === '00') {
      transaction.status = 'SUCCESS';
      await this.transactionRepository.save(transaction);
      
      // Activate subscription using plan details
      if (transaction.type === 'SUBSCRIPTION' && transaction.planCode) {
        const plan = await this.subscriptionPlanService.findByCode(transaction.planCode);
        await this.usersService.activatePremiumSubscription(
          transaction.userId,
          { credits: plan.credits, durationDays: plan.durationDays }
        );
      }
      
      return { success: true, message: 'Payment success' };
    } else {
      transaction.status = 'FAILED';
      await this.transactionRepository.save(transaction);
      return { success: false, message: 'Payment failed or cancelled' };
    }
  }

  // IPN Handler (Server-to-Server)
  async handleIpn(query: ReturnQueryFromVNPay) {
     const verify = await this.vnpayService.verifyIpnCall(query);
     if (!verify.isVerified) {
        return { RspCode: '97', Message: 'Invalid Checksum' };
     }

     const { vnp_TxnRef, vnp_ResponseCode } = query;
     const transaction = await this.transactionRepository.findOne({ where: { vnpayTxnRef: vnp_TxnRef as string } });
     
     if (!transaction) return { RspCode: '01', Message: 'Order not found' };
     
     // Note: If already processed, check status and return idempotent response
     if (transaction.status === 'SUCCESS' && vnp_ResponseCode === '00') {
        return { RspCode: '00', Message: 'Confirm Success' };
     }

     // Reuse logic from handleCallback for DB updates
     await this.handleCallback(query);

     return { RspCode: '00', Message: 'Confirm Success' };
  }
}

