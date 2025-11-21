import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Farm } from './entities/farm.entity';
import { Area } from './entities/area.entity';
import { FarmActivity } from './entities/farm-activity.entity';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { CreateAreaDto } from './dto/create-area.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FarmsService {
  constructor(
    @InjectRepository(Farm)
    private farmsRepository: Repository<Farm>,
    @InjectRepository(Area)
    private areasRepository: Repository<Area>,
    @InjectRepository(FarmActivity)
    private activitiesRepository: Repository<FarmActivity>,
  ) {}

  async createFarm(user: User, createFarmDto: CreateFarmDto): Promise<Farm> {
    // Check if user already has a farm
    const existingFarm = await this.farmsRepository.findOne({ where: { userId: user.id } });
    if (existingFarm) {
      throw new ForbiddenException('User already has a farm');
    }

    const farm = this.farmsRepository.create({
      ...createFarmDto,
      userId: user.id,
    });
    return this.farmsRepository.save(farm);
  }

  async getFarmByUser(user: User): Promise<Farm> {
    const farm = await this.farmsRepository.findOne({
      where: { userId: user.id },
      relations: ['areas'],
    });
    if (!farm) {
      throw new NotFoundException('Farm not found');
    }
    return farm;
  }

  async updateFarm(user: User, updateFarmDto: UpdateFarmDto): Promise<Farm> {
    const farm = await this.getFarmByUser(user);
    Object.assign(farm, updateFarmDto);
    return this.farmsRepository.save(farm);
  }

  async createArea(user: User, createAreaDto: CreateAreaDto): Promise<Area> {
    const farm = await this.getFarmByUser(user);
    const area = this.areasRepository.create({
      ...createAreaDto,
      farmId: farm.id,
    });
    return this.areasRepository.save(area);
  }

  async getAreas(user: User): Promise<Area[]> {
    const farm = await this.getFarmByUser(user);
    return this.areasRepository.find({ where: { farmId: farm.id } });
  }

  async createActivity(user: User, createActivityDto: CreateActivityDto): Promise<FarmActivity> {
    const farm = await this.getFarmByUser(user);
    
    if (createActivityDto.areaId) {
      const area = await this.areasRepository.findOne({ where: { id: createActivityDto.areaId, farmId: farm.id } });
      if (!area) {
        throw new NotFoundException('Area not found in this farm');
      }
    }

    const activity = this.activitiesRepository.create({
      ...createActivityDto,
      farmId: farm.id,
    });
    return this.activitiesRepository.save(activity);
  }

  async getActivities(user: User, limit: number = 20, offset: number = 0): Promise<FarmActivity[]> {
    const farm = await this.getFarmByUser(user);
    return this.activitiesRepository.find({
      where: { farmId: farm.id },
      order: { date: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['area', 'crop'],
    });
  }

  async getFinancialStats(user: User, startDate?: string, endDate?: string) {
    const farm = await this.getFarmByUser(user);
    const query = this.activitiesRepository.createQueryBuilder('activity')
      .where('activity.farmId = :farmId', { farmId: farm.id });

    if (startDate) {
      query.andWhere('activity.date >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('activity.date <= :endDate', { endDate });
    }

    const result = await query
      .select('SUM(activity.cost)', 'totalCost')
      .addSelect('SUM(activity.revenue)', 'totalRevenue')
      .getRawOne();

    return {
      totalCost: parseFloat(result.totalCost || '0'),
      totalRevenue: parseFloat(result.totalRevenue || '0'),
      profit: parseFloat(result.totalRevenue || '0') - parseFloat(result.totalCost || '0'),
    };
  }
}
