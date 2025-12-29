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

  async getAreas(user: User, excludeWithDevices: boolean = false): Promise<Area[]> {
    const farm = await this.getFarmByUser(user);
    
    const query = this.areasRepository.createQueryBuilder('area')
      .where('area.farmId = :farmId', { farmId: farm.id })
      .leftJoinAndSelect('area.devices', 'device');

    if (excludeWithDevices) {
      // Filter areas that have NO devices
      // We use a subquery or check for null on left join if we want to be strict, 
      // but checking if count of devices is 0 is also valid.
      // However, since we left join, we can check if device.id is null
      // But wait, if an area has multiple devices, it will return multiple rows? 
      // No, createQueryBuilder returns entities.
      // Let's use a subquery to be safe and clean.
      
      query.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('count(*)')
          .from('devices', 'd')
          .where('d.area_id = area.id')
          .getQuery();
        return `${subQuery} = 0`;
      });
    }

    return query.getMany();
  }

  async getArea(user: User, areaId: string): Promise<any> {
    const farm = await this.getFarmByUser(user);
    const area = await this.areasRepository.findOne({
      where: { id: areaId, farmId: farm.id },
      relations: ['devices']
    });
    if (!area) {
      throw new NotFoundException('Area not found');
    }
    
    // 🆕 Add computed online status for each device
    const devicesWithStatus = area.devices.map(device => {
      const now = new Date().getTime(); // Current time in milliseconds
      const lastSeenTime = device.lastSeenAt ? new Date(device.lastSeenAt).getTime() : 0;
      const minutesAgo = Math.floor((now - lastSeenTime) / 60000);
      
      // Device is online if seen within last 5 minutes
      const isOnline = device.lastSeenAt && minutesAgo < 5;
      
      return {
        id: device.id,
        serialNumber: device.serialNumber,
        name: device.name,
        type: device.type,
        isActive: device.isActive,        // Activated by technician
        isOnline: isOnline,                // Currently sending data
        lastSeenAt: device.lastSeenAt,
        lastSeenMinutes: device.lastSeenAt ? minutesAgo : null,
      };
    });
    
    return {
      ...area,
      devices: devicesWithStatus,
    };
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

  async getActivities(
    user: User,
    limit: number = 100,
    offset: number = 0,
    startDate?: string,
    endDate?: string,
    type?: string,
    areaId?: string,
    cropName?: string,
    search?: string,
  ): Promise<FarmActivity[]> {
    const farm = await this.getFarmByUser(user);
    
    const query = this.activitiesRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.area', 'area')
      .leftJoinAndSelect('activity.crop', 'crop')
      .where('activity.farmId = :farmId', { farmId: farm.id });

    // Date filters
    if (startDate) {
      query.andWhere('activity.date >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('activity.date <= :endDate', { endDate });
    }

    // Type filter (cast enum to text for LOWER)
    if (type) {
      query.andWhere('LOWER(activity.type::text) = LOWER(:type)', { type });
    }

    // Area filter
    if (areaId) {
      query.andWhere('activity.areaId = :areaId', { areaId });
    }

    // Crop name filter
    if (cropName) {
      query.andWhere('LOWER(activity.cropName) = LOWER(:cropName)', { cropName });
    }

    // Search in description
    if (search) {
      query.andWhere('activity.description ILIKE :search', { search: `%${search}%` });
    }

    return query
      .orderBy('activity.date', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();
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

  async getFinancialBreakdown(user: User, startDate?: string, endDate?: string) {
    const farm = await this.getFarmByUser(user);
    
    // Base query
    const createBaseQuery = () => {
      const query = this.activitiesRepository.createQueryBuilder('activity')
        .where('activity.farmId = :farmId', { farmId: farm.id });
      
      if (startDate) {
        query.andWhere('activity.date >= :startDate', { startDate });
      }
      if (endDate) {
        query.andWhere('activity.date <= :endDate', { endDate });
      }
      return query;
    };

    // Group by Month
    const monthlyData = await createBaseQuery()
      .select("TO_CHAR(activity.date, 'YYYY-MM')", 'month')
      .addSelect('SUM(activity.cost)', 'cost')
      .addSelect('SUM(activity.revenue)', 'revenue')
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();

    // Group by Activity Type
    const typeData = await createBaseQuery()
      .select('activity.type', 'type')
      .addSelect('SUM(activity.cost)', 'cost')
      .addSelect('SUM(activity.revenue)', 'revenue')
      .groupBy('activity.type')
      .getRawMany();

    // Group by Area
    const areaData = await createBaseQuery()
      .leftJoin('activity.area', 'area')
      .select('area.name', 'areaName')
      .addSelect('SUM(activity.cost)', 'cost')
      .addSelect('SUM(activity.revenue)', 'revenue')
      .groupBy('area.name')
      .getRawMany();

    // Group by Crop
    const cropData = await createBaseQuery()
      .select('activity.cropName', 'cropName')
      .addSelect('SUM(activity.cost)', 'cost')
      .addSelect('SUM(activity.revenue)', 'revenue')
      .groupBy('activity.cropName')
      .getRawMany();

    // Format data for frontend
    return {
      monthly: monthlyData.map(item => ({
        name: item.month,
        cost: parseFloat(item.cost || '0'),
        revenue: parseFloat(item.revenue || '0'),
        profit: parseFloat(item.revenue || '0') - parseFloat(item.cost || '0'),
      })),
      byType: typeData.map(item => ({
        name: item.type,
        cost: parseFloat(item.cost || '0'),
        revenue: parseFloat(item.revenue || '0'),
        profit: parseFloat(item.revenue || '0') - parseFloat(item.cost || '0'),
      })),
      byArea: areaData.map(item => ({
        name: item.areaName || 'Unknown',
        cost: parseFloat(item.cost || '0'),
        revenue: parseFloat(item.revenue || '0'),
        profit: parseFloat(item.revenue || '0') - parseFloat(item.cost || '0'),
      })),
      byCrop: cropData.filter(i => i.cropName).map(item => ({
        name: item.cropName,
        cost: parseFloat(item.cost || '0'),
        revenue: parseFloat(item.revenue || '0'),
        profit: parseFloat(item.revenue || '0') - parseFloat(item.cost || '0'),
      })),
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

  // Admin methods
  async getAllFarms() {
    const farms = await this.farmsRepository.find({
      relations: ['user', 'areas'],
      select: {
        id: true,
        name: true,
        address: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    });

    return farms.map(farm => ({
      ...farm,
      areasCount: farm.areas?.length || 0,
      areas: undefined, // Remove detailed areas data
    }));
  }

  async getFarmById(id: string) {
    const farm = await this.farmsRepository.findOne({
      where: { id },
      relations: ['user', 'areas'],
      select: {
        id: true,
        name: true,
        address: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    });

    if (!farm) {
      throw new NotFoundException('Farm not found');
    }

    return {
      ...farm,
      areas: farm.areas?.map(area => ({
        id: area.id,
        name: area.name,
        type: area.type,
        crop: area.crop,
      })),
    };
  }
}
