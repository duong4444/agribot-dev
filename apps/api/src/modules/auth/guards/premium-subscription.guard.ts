import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';

@Injectable()
export class PremiumSubscriptionGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }

    // Get fresh user data from database
    const currentUser = await this.usersService.findById(user.id);

    if (!currentUser) {
      throw new ForbiddenException('User not found');
    }

    // Check if user has active Premium subscription (ACTIVE or TRIAL)
    const isPremiumActive = 
      currentUser.plan === 'PREMIUM' && 
      (currentUser.subscriptionStatus === 'ACTIVE' || currentUser.subscriptionStatus === 'TRIAL');

    if (!isPremiumActive) {
      throw new ForbiddenException(
        'Tính năng điều khiển IoT chỉ dành cho gói Premium. Vui lòng nâng cấp để sử dụng.'
      );
    }

    // Check if subscription is expired
    if (currentUser.subscriptionExpiry && new Date(currentUser.subscriptionExpiry) < new Date()) {
      throw new ForbiddenException(
        'Gói Premium của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng.'
      );
    }

    return true;
  }
}
