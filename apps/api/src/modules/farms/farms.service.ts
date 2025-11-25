import { Injectable, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Farm } from './entities/farm.entity';
import { Area } from './entities/area.entity';
import { Crop } from './entities/crop.entity';
import { FarmActivity } from './entities/farm-activity.entity';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { CreateAreaDto, UpdateAreaDto } from './dto/create-area.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FarmsService implements OnModuleInit {
  constructor(
    @InjectRepository(Farm)
    private farmsRepository: Repository<Farm>,
    @InjectRepository(Area)
    private areasRepository: Repository<Area>,
    @InjectRepository(Crop)
    private cropsRepository: Repository<Crop>,
    @InjectRepository(FarmActivity)
    private activitiesRepository: Repository<FarmActivity>,
  ) {}

  async onModuleInit() {
    await this.seedCrops();
  }

  private async seedCrops() {
    const count = await this.cropsRepository.count();
    if (count > 0) {
      return; // Already seeded
    }

    const crops = [
      { name: 'Cam sành', description: 'Cây ăn quả họ cam quýt, được trồng phổ biến ở miền Nam Việt Nam' },
      { name: 'Lúa ST25', description: 'Giống lúa thơm đặc sản, đoạt giải lúa gạo ngon nhất thế giới năm 2019' },
      { name: 'Xoài cát chu', description: 'Giống xoài nổi tiếng tại Đồng Tháp, có hương vị thơm ngọt' },
      { name: 'Bưởi da xanh', description: 'Đặc sản miền Tây, thịt quả ngọt, ít chua' },
      { name: 'Chanh không hạt', description: 'Cây gia vị phổ biến, dùng trong nấu ăn và làm đồ uống' },
      { name: 'Cà phê robusta', description: 'Cây công nghiệp chủ lực tại Tây Nguyên' },
      { name: 'Tiêu đen', description: 'Cây gia vị có giá trị kinh tế cao' },
      { name: 'Sầu riêng Ri6', description: 'Giống sầu riêng cao cấp, thịt dày, béo, ít xơ' },
      { name: 'Thanh long ruột đỏ', description: 'Trái cây ăn tươi, xuất khẩu nhiều' },
      { name: 'Măng cụt', description: 'Trái cây quý, được mệnh danh là nữ hoàng trái cây' },
    ];

    await this.cropsRepository.save(crops);
    console.log('✅ Seeded 10 crops successfully');
  }

  async seedCropsManually() {
    await this.seedCrops();
    const count = await this.cropsRepository.count();
    return { message: 'Crops seeded successfully', count };
  }

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

  async getArea(user: User, areaId: string): Promise<Area> {
    const farm = await this.getFarmByUser(user);
    const area = await this.areasRepository.findOne({
      where: { id: areaId, farmId: farm.id },
      relations: ['devices']
    });
    if (!area) {
      throw new NotFoundException('Area not found');
    }
    return area;
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

  async updateArea(user: User, areaId: string, updateDto: UpdateAreaDto): Promise<Area> {
    const farm = await this.getFarmByUser(user);
    const area = await this.areasRepository.findOne({
      where: { id: areaId, farmId: farm.id }
    });
    if (!area) {
      throw new NotFoundException('Area not found');
    }
    Object.assign(area, updateDto);
    return this.areasRepository.save(area);
  }

  async deleteArea(user: User, areaId: string) {
    const farm = await this.getFarmByUser(user);
    const result = await this.areasRepository.delete({
      id: areaId,
      farmId: farm.id
    });
    if (result.affected === 0) {
      throw new NotFoundException('Area not found');
    }
    return { message: 'Area deleted successfully' };
  }

  async updateActivity(user: User, activityId: string, updateDto: UpdateActivityDto): Promise<FarmActivity> {
    const farm = await this.getFarmByUser(user);
    const activity = await this.activitiesRepository.findOne({
      where: { id: activityId, farmId: farm.id }
    });
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }
    Object.assign(activity, updateDto);
    return this.activitiesRepository.save(activity);
  }

  async deleteActivity(user: User, activityId: string) {
    const farm = await this.getFarmByUser(user);
    const result = await this.activitiesRepository.delete({
      id: activityId,
      farmId: farm.id
    });
    if (result.affected === 0) {
      throw new NotFoundException('Activity not found');
    }
    return { message: 'Activity deleted successfully' };
  }

  async getCrops(): Promise<Crop[]> {
    return this.cropsRepository.find({
      order: { name: 'ASC' }
    });
  }
}
