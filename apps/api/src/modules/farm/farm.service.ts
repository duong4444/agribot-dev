import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Farm, Crop, Activity, Expense } from './entities';
import { CreateFarmDto, CreateCropDto, CreateActivityDto } from './dto';

@Injectable()
export class FarmService {
  constructor(
    @InjectRepository(Farm)
    private farmRepository: Repository<Farm>,
    @InjectRepository(Crop)
    private cropRepository: Repository<Crop>,
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
  ) {}

  // ==================== FARM MANAGEMENT ====================

  async createFarm(user: User, createFarmDto: CreateFarmDto): Promise<Farm> {
    const farm = this.farmRepository.create({
      ...createFarmDto,
      userId: user.id,
    });

    return await this.farmRepository.save(farm);
  }

  async getFarmsByUser(user: User): Promise<Farm[]> {
    return await this.farmRepository.find({
      where: { userId: user.id },
      relations: ['crops', 'activities'],
      order: { createdAt: 'DESC' },
    });
  }

  async getFarmById(id: string, user: User): Promise<Farm> {
    const farm = await this.farmRepository.findOne({
      where: { id, userId: user.id },
      relations: ['crops', 'activities', 'user'],
    });

    if (!farm) {
      throw new NotFoundException('Farm not found');
    }

    return farm;
  }

  async updateFarm(id: string, user: User, updateData: Partial<Farm>): Promise<Farm> {
    const farm = await this.getFarmById(id, user);
    
    Object.assign(farm, updateData);
    return await this.farmRepository.save(farm);
  }

  async deleteFarm(id: string, user: User): Promise<void> {
    const farm = await this.getFarmById(id, user);
    await this.farmRepository.remove(farm);
  }

  // ==================== CROP MANAGEMENT ====================

  async createCrop(createCropDto: CreateCropDto, user: User): Promise<Crop> {
    // Verify farm belongs to user
    const farm = await this.getFarmById(createCropDto.farmId, user);

    const crop = this.cropRepository.create({
      ...createCropDto,
      farm,
    });

    return await this.cropRepository.save(crop);
  }

  async getCropsByFarm(farmId: string, user: User): Promise<Crop[]> {
    // Verify farm belongs to user
    await this.getFarmById(farmId, user);

    return await this.cropRepository.find({
      where: { farmId },
      relations: ['farm', 'activities'],
      order: { createdAt: 'DESC' },
    });
  }

  async getCropById(id: string, user: User): Promise<Crop> {
    const crop = await this.cropRepository.findOne({
      where: { id },
      relations: ['farm', 'activities'],
    });

    if (!crop || crop.farm.userId !== user.id) {
      throw new NotFoundException('Crop not found');
    }

    return crop;
  }

  async updateCrop(id: string, user: User, updateData: Partial<Crop>): Promise<Crop> {
    const crop = await this.getCropById(id, user);
    
    Object.assign(crop, updateData);
    return await this.cropRepository.save(crop);
  }

  async deleteCrop(id: string, user: User): Promise<void> {
    const crop = await this.getCropById(id, user);
    await this.cropRepository.remove(crop);
  }

  // ==================== ACTIVITY MANAGEMENT ====================

  async createActivity(createActivityDto: CreateActivityDto, user: User): Promise<Activity> {
    // Verify farm belongs to user
    const farm = await this.getFarmById(createActivityDto.farmId, user);

    const activity = this.activityRepository.create({
      ...createActivityDto,
      farm,
    });

    // If cropId is provided, verify it belongs to the farm
    if (createActivityDto.cropId) {
      const crop = await this.getCropById(createActivityDto.cropId, user);
      activity.crop = crop;
    }

    return await this.activityRepository.save(activity);
  }

  async getActivitiesByFarm(farmId: string, user: User): Promise<Activity[]> {
    // Verify farm belongs to user
    await this.getFarmById(farmId, user);

    return await this.activityRepository.find({
      where: { farmId },
      relations: ['farm', 'crop'],
      order: { scheduledDate: 'DESC' },
    });
  }

  async getActivitiesByCrop(cropId: string, user: User): Promise<Activity[]> {
    // Verify crop belongs to user
    await this.getCropById(cropId, user);

    return await this.activityRepository.find({
      where: { cropId },
      relations: ['farm', 'crop'],
      order: { scheduledDate: 'DESC' },
    });
  }

  async getActivityById(id: string, user: User): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: ['farm', 'crop'],
    });

    if (!activity || activity.farm.userId !== user.id) {
      throw new NotFoundException('Activity not found');
    }

    return activity;
  }

  async updateActivity(id: string, user: User, updateData: Partial<Activity>): Promise<Activity> {
    const activity = await this.getActivityById(id, user);
    
    Object.assign(activity, updateData);
    return await this.activityRepository.save(activity);
  }

  async deleteActivity(id: string, user: User): Promise<void> {
    const activity = await this.getActivityById(id, user);
    await this.activityRepository.remove(activity);
  }

  // ==================== ANALYTICS & REPORTS ====================

  async getFarmAnalytics(farmId: string, user: User) {
    const farm = await this.getFarmById(farmId, user);
    
    const crops = await this.cropRepository.find({
      where: { farmId },
    });

    const activities = await this.activityRepository.find({
      where: { farmId },
    });

    const expenses = await this.expenseRepository.find({
      where: { farmId },
    });

    // Calculate statistics
    const totalCrops = crops.length;
    const activeCrops = crops.filter(crop => crop.status === 'GROWING' || crop.status === 'PLANTED').length;
    const harvestedCrops = crops.filter(crop => crop.status === 'HARVESTED').length;

    const totalActivities = activities.length;
    const completedActivities = activities.filter(activity => activity.status === 'COMPLETED').length;
    const pendingActivities = activities.filter(activity => activity.status === 'PLANNED').length;

    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const paidExpenses = expenses
      .filter(expense => expense.status === 'PAID')
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    const totalYield = crops
      .filter(crop => crop.actualYield)
      .reduce((sum, crop) => sum + Number(crop.actualYield), 0);

    const estimatedRevenue = crops
      .filter(crop => crop.actualYield && crop.marketPrice)
      .reduce((sum, crop) => sum + (Number(crop.actualYield) * Number(crop.marketPrice)), 0);

    return {
      farm: {
        id: farm.id,
        name: farm.name,
        area: farm.area,
        type: farm.type,
      },
      crops: {
        total: totalCrops,
        active: activeCrops,
        harvested: harvestedCrops,
        totalYield: totalYield,
      },
      activities: {
        total: totalActivities,
        completed: completedActivities,
        pending: pendingActivities,
      },
      finances: {
        totalExpenses: totalExpenses,
        paidExpenses: paidExpenses,
        pendingExpenses: totalExpenses - paidExpenses,
        estimatedRevenue: estimatedRevenue,
        estimatedProfit: estimatedRevenue - totalExpenses,
      },
    };
  }

  async getUpcomingActivities(user: User, days: number = 7): Promise<Activity[]> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    return await this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.farm', 'farm')
      .leftJoinAndSelect('activity.crop', 'crop')
      .where('farm.userId = :userId', { userId: user.id })
      .andWhere('activity.scheduledDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('activity.status IN (:...statuses)', {
        statuses: ['PLANNED', 'IN_PROGRESS'],
      })
      .orderBy('activity.scheduledDate', 'ASC')
      .getMany();
  }

  // ==================== EXPENSE MANAGEMENT ====================

  async createExpense(createExpenseDto: any, user: User): Promise<Expense> {
    // Verify farm belongs to user
    const farm = await this.getFarmById(createExpenseDto.farmId, user);

    const expenseData = {
      ...createExpenseDto,
      farmId: farm.id,
    };

    return await this.expenseRepository.save(expenseData);
  }

  async getExpensesByFarm(farmId: string, user: User): Promise<Expense[]> {
    // Verify farm belongs to user
    await this.getFarmById(farmId, user);

    return await this.expenseRepository.find({
      where: { farmId },
      relations: ['farm', 'crop', 'activity'],
      order: { expenseDate: 'DESC' },
    });
  }

  async getExpenseById(id: string, user: User): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: ['farm', 'crop', 'activity'],
    });

    if (!expense || expense.farm.userId !== user.id) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async updateExpense(id: string, user: User, updateData: Partial<Expense>): Promise<Expense> {
    const expense = await this.getExpenseById(id, user);
    
    Object.assign(expense, updateData);
    return await this.expenseRepository.save(expense);
  }

  async deleteExpense(id: string, user: User): Promise<void> {
    const expense = await this.getExpenseById(id, user);
    await this.expenseRepository.remove(expense);
  }
}