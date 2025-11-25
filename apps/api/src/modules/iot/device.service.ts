import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { CreateDeviceDto, UpdateDeviceDto } from './dto/device.dto';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  async findAll(farmId?: string) {
    const query = this.deviceRepository.createQueryBuilder('device')
      .leftJoinAndSelect('device.area', 'area')
      .orderBy('device.createdAt', 'DESC');

    if (farmId) {
      query.where('area.farmId = :farmId', { farmId });
    }

    return query.getMany();
  }

  async findOne(id: string) {
    const device = await this.deviceRepository.findOne({
      where: { id },
      relations: ['area'],
    });
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return device;
  }

  async create(createDeviceDto: any) {
    const device = this.deviceRepository.create(createDeviceDto);
    return this.deviceRepository.save(device);
  }

  async assignToArea(deviceId: string, areaId: string) {
    console.log(`Assigning device ${deviceId} to area ${areaId}`);
    const device = await this.findOne(deviceId);
    device.areaId = areaId;
    const saved = await this.deviceRepository.save(device);
    console.log('Saved device:', saved);
    return saved;
  }

  async update(id: string, updateDeviceDto: any) {
    const device = await this.findOne(id);
    Object.assign(device, updateDeviceDto);
    return this.deviceRepository.save(device);
  }
}
