import { Injectable, NotFoundException, BadRequestException, OnModuleInit, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, SubscriptionPlan, SubscriptionStatus } from './entities/user.entity';
import { InstallationRequest } from '../iot/entities/installation-request.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(InstallationRequest)
    private installationRequestRepository: Repository<InstallationRequest>,
  ) {}
  // kma
  onModuleInit() {
    // Check expiry every hour
    setInterval(() => {
      this.checkSubscriptionExpiry();
    }, 1000 * 60 * 60);
    
    // Run immediately on startup
    this.checkSubscriptionExpiry();
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findAll(role?: UserRole): Promise<User[]> {
    const where = role ? { role } : {};
    return this.userRepository.find({
      select: ['id', 'email', 'fullName', 'role', 'isActive', 'createdAt', 'updatedAt', 'plan', 'subscriptionStatus', 'credits', 'subscriptionExpiry'],
      where,
    });
  }

  async create(userData: {
    fullName: string;
    email: string;
    password: string;
    phoneNumber?: string;
    role?: UserRole;
  }): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cascade delete will automatically remove related installation_requests, farms, and areas
    await this.userRepository.remove(user);
  }

  async activate(id: string): Promise<User> {
    return this.update(id, { isActive: true });
  }

  async deactivate(id: string): Promise<User> {
    return this.update(id, { isActive: false });
  }

  async changeRole(id: string, role: string): Promise<User> {
    return this.update(id, { role: role as any });
  }

  // ĐANG LÀ MOCK
  async upgradeSubscription(id: string): Promise<User> {
    // Check if user has completed hardware installation
    // phải lắp đặt IoT rồi mới mua premium đc
    const hasHardware = await this.installationRequestRepository.findOne({
      where: {
        farmerId: id,
        status: 'COMPLETED' as any, // InstallationRequestStatus.COMPLETED
      },
    });

    if (!hasHardware) {
      throw new ForbiddenException('Vui lòng lắp đặt thiết bị phần cứng trước khi đăng ký gói Premium.');
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now

    return this.update(id, {
      plan: 'PREMIUM' as any,
      subscriptionStatus: 'ACTIVE' as any,
      subscriptionExpiry: expiryDate,
      credits: 200, // Reset credits to 200
    });
  }

  async activateTrial(id: string): Promise<User> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days trial

    return this.update(id, {
      plan: 'PREMIUM' as any,
      subscriptionStatus: 'TRIAL' as any,
      subscriptionExpiry: expiryDate,
      credits: 50, // 50 credits for trial
      trialStartedAt: new Date(),
    });
  }

  // Manual Cron Job: Check for expired subscriptions
  async checkSubscriptionExpiry() {
    const now = new Date();
    // Find premium users (ACTIVE or TRIAL) with expired date
    const expiredUsers = await this.userRepository.createQueryBuilder('user')
      .where('user.plan = :plan', { plan: 'PREMIUM' })
      .andWhere('user.subscriptionStatus IN (:...statuses)', { statuses: ['ACTIVE', 'TRIAL'] })
      .andWhere('user.subscriptionExpiry < :now', { now })
      .getMany();

    for (const user of expiredUsers) {
      await this.update(user.id, {
        subscriptionStatus: 'INACTIVE' as any,
        credits: 0, // Reset credits when subscription expires
      });
      console.log(`[Subscription] Deactivated user ${user.email} due to expiry. Credits reset to 0.`);
    }
  }

  async activatePremiumSubscription(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(now.getDate() + 30); // Add 30 days

    user.plan = SubscriptionPlan.PREMIUM;
    user.subscriptionStatus = SubscriptionStatus.ACTIVE;
    user.subscriptionExpiry = expiryDate;
    user.credits = 200; 

    return this.userRepository.save(user);
  }
}
