import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request, Response } from 'express';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // "click btn thanh toán VNPAY sẽ gọi đến đây"
  @Post('create-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create VNPAY payment URL for subscription' })
  async createPaymentUrl(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Body() body: { type: 'SUBSCRIPTION'; planCode: string },
  ) {
    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log("[payment.controller]_ ipAddr: ",ipAddr);
    
    // Handle array case for x-forwarded-for
    const ip = Array.isArray(ipAddr) ? ipAddr[0] : ipAddr || '127.0.0.1';
    console.log("ĐÂY LÀ IP GỬI đến VNPAY [payment.controller]_ ip: ",ip);

    const url = await this.paymentService.createSubscriptionPaymentUrl(
      user.id,
      ip,
      body.planCode,
    );
    console.log("[payment.controller] url trả về để pass cho FE: ",url);
    
    return { url };
  }
  // ipn version localhost - lợi dụng browser redirect
  @Get('vnpay-return')
  @ApiOperation({ summary: 'Handle VNPAY return (browser redirect)' })
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    try {
      console.log("[payment.controller]---------GET vnpay-return----------");
      console.log("query nhận vào trong GET vnpay-return: ",query);
      
      const result = await this.paymentService.handleCallback(query);
      console.log("result trong GET vnpay-return: ",result);
      
      if (result.success) {
        // Redirect to success page
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/return?status=success`,
        );
      } else {
        // Redirect to failure page
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/return?status=failed`,
        );
      }
    } catch (error) {
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/return?status=error`,
      );
    }
  }

  @Get('vnpay-ipn')
  @ApiOperation({ summary: 'Handle VNPAY IPN (server-to-server)' })
  async vnpayIpn(@Query() query: any) {
    return this.paymentService.handleIpn(query);
  }
}
