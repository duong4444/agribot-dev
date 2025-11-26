import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device, DeviceStatus, DeviceType } from './entities/device.entity';
import { CreateDeviceDto, UpdateDeviceDto } from './dto/device.dto';
import { ActivateDeviceDto } from './dto/installation-request.dto';

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

  // New inventory management methods
  async createInventoryDevice(serialNumber: string, type: string, name: string) {
    // Check if device already exists
    const existing = await this.deviceRepository.findOne({
      where: { serialNumber },
    });

    if (existing) {
      throw new BadRequestException('Device with this serial number already exists');
    }

    const device = this.deviceRepository.create({
      serialNumber,
      type: type as any, // Type will be validated by enum constraint
      name,
      status: DeviceStatus.AVAILABLE,
      isActive: false,
    });

    return this.deviceRepository.save(device);
  }

  async activateDevice(dto: ActivateDeviceDto, technicianId: string) {
    let device = await this.deviceRepository.findOne({
      where: { serialNumber: dto.serialNumber },
    });

    // If device doesn't exist, create it (first-time activation)
    if (!device) {
      device = this.deviceRepository.create({
        serialNumber: dto.serialNumber,
        type: DeviceType.SENSOR_NODE, // Standard IoT package
        name: `IoT Device ${dto.serialNumber}`,
        status: DeviceStatus.AVAILABLE,
        isActive: false,
      });
      device = await this.deviceRepository.save(device);
    }

    if (device.status === DeviceStatus.ACTIVE) {
      throw new BadRequestException('Device is already active');
    }

    device.areaId = dto.areaId;
    device.status = DeviceStatus.ACTIVE;
    device.isActive = true;
    device.activatedBy = technicianId;
    device.activatedAt = new Date();

    return this.deviceRepository.save(device);
  }

  async findByStatus(status: DeviceStatus) {
    return this.deviceRepository.find({
      where: { status },
      relations: ['area'],
      order: { createdAt: 'DESC' },
    });
  }

  async findBySerialNumber(serialNumber: string) {
    return this.deviceRepository.findOne({
      where: { serialNumber },
      relations: ['area'],
    });
  }
}
