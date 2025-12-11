import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SubscriptionPlanService } from './subscription-plan.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './dto/subscription-plan.dto';

@Controller('subscription-plans')
export class SubscriptionPlanController {
  constructor(private readonly planService: SubscriptionPlanService) {}

  /**
   * Get all active subscription plans (public - for pricing page)
   */
  @Get('active')
  async getActivePlans() {
    const plans = await this.planService.findActive();
    return { success: true, data: plans };
  }

  /**
   * Get all subscription plans (admin only - includes inactive)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllPlans() {
    const plans = await this.planService.findAll(true);
    return { success: true, data: plans };
  }

  /**
   * Get a single subscription plan by ID (admin only)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getPlanById(@Param('id') id: string) {
    const plan = await this.planService.findById(id);
    return { success: true, data: plan };
  }

  /**
   * Create a new subscription plan (admin only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createPlan(@Body() dto: CreateSubscriptionPlanDto) {
    const plan = await this.planService.create(dto);
    return { success: true, data: plan, message: 'Tạo gói đăng ký thành công' };
  }

  /**
   * Update an existing subscription plan (admin only)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updatePlan(@Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    const plan = await this.planService.update(id, dto);
    return { success: true, data: plan, message: 'Cập nhật gói đăng ký thành công' };
  }

  /**
   * Delete a subscription plan (admin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deletePlan(@Param('id') id: string) {
    await this.planService.delete(id);
    return { success: true, message: 'Xóa gói đăng ký thành công' };
  }

  /**
   * Toggle active status of a subscription plan (admin only)
   */
  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async toggleActive(@Param('id') id: string) {
    const plan = await this.planService.toggleActive(id);
    return { 
      success: true, 
      data: plan, 
      message: plan.isActive ? 'Đã kích hoạt gói đăng ký' : 'Đã tắt gói đăng ký' 
    };
  }
}
