import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './dto/subscription-plan.dto';

@Injectable()
export class SubscriptionPlanService {
  private readonly logger = new Logger(SubscriptionPlanService.name);

  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
  ) {}

  /**
   * Get all subscription plans (for admin - includes inactive)
   */
  async findAll(includeInactive: boolean = true): Promise<SubscriptionPlan[]> {
    const where = includeInactive ? {} : { isActive: true };
    return this.planRepository.find({
      where,
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Get only active subscription plans (for user pricing page)
   */
  async findActive(): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Get a single plan by ID
   */
  async findById(id: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found`);
    }
    return plan;
  }

  /**
   * Get a single plan by code (e.g., 'MONTHLY', 'YEARLY')
   */
  async findByCode(code: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepository.findOne({ where: { code } });
    if (!plan) {
      throw new NotFoundException(`Subscription plan with code ${code} not found`);
    }
    return plan;
  }

  /**
   * Create a new subscription plan
   */
  async create(dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    // Check if code already exists
    const existing = await this.planRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Subscription plan with code ${dto.code} already exists`);
    }

    const plan = this.planRepository.create(dto);
    const saved = await this.planRepository.save(plan);
    this.logger.log(`Created subscription plan: ${saved.code} (${saved.id})`);
    return saved;
  }

  /**
   * Update an existing subscription plan
   */
  async update(id: string, dto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const plan = await this.findById(id);

    // If code is being changed, check for duplicates
    if (dto.code && dto.code !== plan.code) {
      const existing = await this.planRepository.findOne({ where: { code: dto.code } });
      if (existing) {
        throw new ConflictException(`Subscription plan with code ${dto.code} already exists`);
      }
    }

    Object.assign(plan, dto);
    const saved = await this.planRepository.save(plan);
    this.logger.log(`Updated subscription plan: ${saved.code} (${saved.id})`);
    return saved;
  }

  /**
   * Delete a subscription plan
   */
  async delete(id: string): Promise<void> {
    const plan = await this.findById(id);
    await this.planRepository.remove(plan);
    this.logger.log(`Deleted subscription plan: ${plan.code} (${id})`);
  }

  /**
   * Toggle active status of a subscription plan
   */
  async toggleActive(id: string): Promise<SubscriptionPlan> {
    const plan = await this.findById(id);
    plan.isActive = !plan.isActive;
    const saved = await this.planRepository.save(plan);
    this.logger.log(`Toggled subscription plan ${saved.code} active status to: ${saved.isActive}`);
    return saved;
  }
}
