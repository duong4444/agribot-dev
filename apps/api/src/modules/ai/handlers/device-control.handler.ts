import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import { Device, DeviceStatus, DeviceType } from '../../iot/entities/device.entity';
import { Area } from '../../farms/entities/area.entity';
import { IrrigationService } from '../../iot/services/irrigation.service';
import { LightingService } from '../../iot/services/lighting.service';
import { Entity } from '../types';

export interface DeviceControlAction {
  deviceType: 'pump' | 'light';
  action: 'on' | 'off';
  area: string;
  duration?: number; // seconds
  deviceId?: string;
}

export interface DeviceControlResult {
  success: boolean;
  message: string;
  deviceType: string;
  area: string;
  action: string;
  duration?: number;
}

@Injectable()
export class DeviceControlHandler {
  private readonly logger = new Logger(DeviceControlHandler.name);

  // Device name normalization map
  private readonly DEVICE_TYPE_MAP: Record<string, 'pump' | 'light'> = {
    // Pump aliases
    'tưới': 'pump',
    'bơm': 'pump',
    'máy bơm': 'pump',
    'máy tưới': 'pump',
    'bơm nước': 'pump',
    'hệ thống tưới': 'pump',
    'tưới tự động': 'pump',
    
    // Light aliases
    'đèn': 'light',
    'bóng đèn': 'light',
    'đèn chiếu sáng': 'light',
  };

  // Action detection keywords
  private readonly ACTION_KEYWORDS = {
    on: ['bật', 'mở', 'khởi động', 'start', 'on'],
    off: ['tắt', 'dừng', 'ngừng', 'stop', 'off'],
  };

  // Response templates
  private readonly RESPONSE_TEMPLATES = {
    pump: {
      on_duration: 'Đã bật tưới {area} trong {duration}',
      on: 'Đã bật tưới {area}',
      off: 'Đã tắt tưới {area}',
    },
    light: {
      on: 'Đã bật đèn {area}',
      off: 'Đã tắt đèn {area}',
    },
  };

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    private readonly irrigationService: IrrigationService,
    private readonly lightingService: LightingService,
  ) {}

  /**
   * Handle device control command from chatbot
   */
  async handle(
    userId: string,
    entities: Entity[],
    message: string,
  ): Promise<DeviceControlResult> {
    this.logger.log(`Handling device control for user ${userId}`);
    this.logger.debug(`Entities: ${JSON.stringify(entities)}`);
    this.logger.debug(`Message: ${message}`);

    // Extract entities
    const deviceEntity = entities.find(e => e.type === 'device_name');
    const areaEntity = entities.find(e => e.type === 'farm_area');
    // Fallback: NER might label duration as 'date'
    const durationEntity = entities.find(e => e.type === 'duration' || e.type === 'date');

    if (!deviceEntity) {
      throw new BadRequestException('Không tìm thấy tên thiết bị trong câu lệnh');
    }

    if (!areaEntity) {
      throw new BadRequestException('Không tìm thấy khu vực trong câu lệnh');
    }

    // Normalize device name
    const deviceType = this.normalizeDeviceName(deviceEntity.value);
    console.log("deviceType _ được normalize: ",deviceType);
    
    if (!deviceType) {
      throw new BadRequestException(`Thiết bị "${deviceEntity.value}" không được hỗ trợ`);
    }

    // Detect action (on/off)
    const action = this.detectAction(message);
    console.log("action _từ detectAction: ",action);
    
    if (!action) {
      throw new BadRequestException('Không xác định được hành động (bật/tắt)');
    }

    // Parse duration if provided
    const duration = durationEntity ? this.parseDuration(durationEntity.value) : undefined;

    // Find area
    const area = await this.findArea(areaEntity.value, userId);
    console.log("area _từ findArea: ",area);
    

    // Find device
    const device = await this.findDevice(deviceType, area.id, userId);
    console.log("device _từ findDevice: ",device);


    // Detect if user wants to control Auto Mode
    const isAutoModeRequest = this.isAutoModeRequest(message);

    // If auto mode request, check if it's a configuration attempt (threshold, duration, etc.)
    if (isAutoModeRequest && this.isConfigurationRequest(message)) {
      return {
        success: false,
        message: 'Vui lòng sử dụng Farm Dashboard để thay đổi các thông số tưới tự động (ngưỡng ẩm, thời gian tưới...).',
        deviceType,
        area: area.name,
        action,
      };
    }

    // Execute command
    if (isAutoModeRequest && deviceType === 'pump') {
       // Handle Auto Mode Toggle
       await this.irrigationService.updateAutoConfig(device.serialNumber, { enabled: action === 'on' }, userId);
       const response = action === 'on' 
         ? `Đã bật chế độ tưới tự động cho ${area.name}`
         : `Đã tắt chế độ tưới tự động cho ${area.name}`;
       
       return {
        success: true,
        message: response,
        deviceType,
        area: area.name,
        action,
      };
    } else {
       // Manual Control
       await this.executeCommand(device, action, deviceType, duration);
    }

    // Format response (for manual control)
    const response = this.formatResponse(deviceType, action, area.name, duration);

    return {
      success: true,
      message: response,
      deviceType,
      area: area.name,
      action,
      duration,
    };
  }
  /**
   * Normalize device name to standard type
   */
  private normalizeDeviceName(deviceName: string): 'pump' | 'light' | null {
    const normalized = deviceName.toLowerCase().trim();
    return this.DEVICE_TYPE_MAP[normalized] || null;
  }

  private detectAction(message: string): 'on' | 'off' | null {
    const messageLower = message.toLowerCase();

    // Check for "on" keywords
    if (this.ACTION_KEYWORDS.on.some(keyword => messageLower.includes(keyword))) {
      return 'on';
    }

    // Check for "off" keywords
    if (this.ACTION_KEYWORDS.off.some(keyword => messageLower.includes(keyword))) {
      return 'off';
    }

    return null;
  }

  /**
   * Parse duration string to seconds
   */
  private parseDuration(durationStr: string): number {
    const normalized = durationStr.toLowerCase().trim();

    // Match patterns like "5 phút", "10 phút", "1 giờ"
    const minuteMatch = normalized.match(/(\d+)\s*phút/);
    if (minuteMatch) {
      return parseInt(minuteMatch[1]) * 60;
    }

    const hourMatch = normalized.match(/(\d+)\s*giờ/);
    if (hourMatch) {
      return parseInt(hourMatch[1]) * 3600;
    }

    // Special cases
    if (normalized.includes('nửa tiếng')) {
      return 1800; // 30 minutes
    }

    const hourHalfMatch = normalized.match(/(\d+)\s*tiếng\s*rưỡi/);
    if (hourHalfMatch) {
      return parseInt(hourHalfMatch[1]) * 3600 + 1800;
    }
    
    // Fallback: try to parse just number as minutes if context implies
    const numberMatch = normalized.match(/^(\d+)$/);
    if (numberMatch) {
        return parseInt(numberMatch[1]) * 60;
    }

    // If it's a date entity but not a duration string, ignore it (return undefined or 0)
    // But here we throw error. Let's be lenient.
    // throw new BadRequestException(`Không thể phân tích thời gian: ${durationStr}`);
    this.logger.warn(`Could not parse duration from: ${durationStr}`);
    return 0; // Return 0 to indicate no valid duration found
  }

  /**
   * Find area by name and verify ownership
   */
  private async findArea(areaName: string, userId: string): Promise<Area> {
    // Try exact match first, scoped to user's farms
    let area = await this.areaRepository.findOne({
      where: { 
        name: areaName,
        farm: { userId } 
      },
      relations: ['farm'],
    });
    
    // If not found, try case-insensitive match, scoped to user's farms
    if (!area) {
        area = await this.areaRepository.findOne({
            where: { 
              name: ILike(areaName),
              farm: { userId }
            },
            relations: ['farm'],
        });
    }

    // If still not found, try matching partial name, scoped to user's farms
    if (!area) {
         area = await this.areaRepository.findOne({
            where: { 
              name: ILike(`%${areaName}%`),
              farm: { userId }
            },
            relations: ['farm'],
        });
    }

    if (!area) {
      throw new NotFoundException(`Không tìm thấy khu vực "${areaName}" của bạn`);
    }

    // No need to check ownership again because we filtered by userId in the query
    // But for safety/sanity check:
    if (area.farm.userId !== userId) {
      this.logger.error(`Forbidden: Area owner ${area.farm.userId} !== Request user ${userId}`);
      throw new ForbiddenException('Bạn không có quyền điều khiển thiết bị ở khu vực này');
    }

    return area;
  }

  /**
   * Find device by type and area
   */
  private async findDevice(
    deviceType: 'pump' | 'light',
    areaId: string,
    userId: string,
  ): Promise<Device> {
    // DEBUG: Log all devices in this area
    const allDevices = await this.deviceRepository.find({ where: { areaId } });
    this.logger.debug(`[DEBUG] Devices in area ${areaId}: ${JSON.stringify(allDevices)}`);

    // Map 'pump'/'light' to DeviceType.CONTROLLER and name pattern
    let device = await this.deviceRepository.findOne({
      where: {
        areaId,
        type: DeviceType.CONTROLLER, // Assuming actuators are CONTROLLERs
        status: In([DeviceStatus.ACTIVE, DeviceStatus.ASSIGNED]),
        // name: ILike(`%${deviceType === 'pump' ? 'bơm' : 'đèn'}%`), // Optional: filter by name
      },
      relations: ['area', 'area.farm'],
    });

    // Fallback for DEMO: If no controller found, try SENSOR_NODE
    if (!device) {
        this.logger.warn(`[DEMO] No CONTROLLER found, trying SENSOR_NODE fallback for area ${areaId}`);
        device = await this.deviceRepository.findOne({
            where: {
                areaId,
                type: DeviceType.SENSOR_NODE,
                status: In([DeviceStatus.ACTIVE, DeviceStatus.ASSIGNED]),
            },
            relations: ['area', 'area.farm'],
        });
    }

    if (!device) {
      const deviceNameVi = deviceType === 'pump' ? 'máy bơm' : 'đèn';
      throw new NotFoundException(`Không tìm thấy ${deviceNameVi} (Controller) trong khu vực này`);
    }

    // Double-check ownership
    if (device.area.farm.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền điều khiển thiết bị này');
    }

    return device;
  }

  /**
   * Execute device command
   */
  private async executeCommand(
    device: Device,
    action: 'on' | 'off',
    targetDeviceType: 'pump' | 'light',
    duration?: number,
  ): Promise<void> {
    // Services expect serialNumber, not UUID
    const deviceId = device.serialNumber;
    const userId = device.area.farm.userId;

    // Use the requested device type instead of inferring from device name
    // This allows controlling a generic demo device as a pump or light based on user intent
    if (targetDeviceType === 'pump') {
      if (action === 'on') {
        if (duration) {
          await this.irrigationService.irrigateDuration(deviceId, { duration }, userId);
        } else {
          await this.irrigationService.turnOnPump(deviceId, userId);
        }
      } else {
        await this.irrigationService.turnOffPump(deviceId, userId);
      }
    } else {
      // Light
      if (action === 'on') {
        await this.lightingService.turnOn(deviceId, userId);
      } else {
        await this.lightingService.turnOff(deviceId, userId);
      }
    }
  }

  /**
   * Helper to check if device is a pump
   */
  private isPump(device: Device): boolean {
    const name = device.name.toLowerCase();
    return name.includes('bơm') || name.includes('tưới') || name.includes('pump');
  }

  /**
   * Format response message
   */
  private formatResponse(
    deviceType: 'pump' | 'light',
    action: 'on' | 'off',
    areaName: string,
    duration?: number,
  ): string {
    const templates: any = this.RESPONSE_TEMPLATES[deviceType];

    if (deviceType === 'pump' && action === 'on' && duration) {
      const durationStr = this.formatDuration(duration);
      return templates.on_duration
        .replace('{area}', areaName)
        .replace('{duration}', durationStr);
    }

    const template = action === 'on' ? templates.on : templates.off;
    return template.replace('{area}', areaName);
  }

  /**
   * Format duration for display
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} giây`;
    }

    const minutes = Math.floor(seconds / 60);
    if (seconds % 60 === 0) {
      if (minutes < 60) {
        return `${minutes} phút`;
      }
      const hours = Math.floor(minutes / 60);
      if (minutes % 60 === 0) {
        return `${hours} giờ`;
      }
      return `${hours} giờ ${minutes % 60} phút`;
    }

    return `${minutes} phút ${seconds % 60} giây`;
  }

  private isAutoModeRequest(message: string): boolean {
    const keywords = ['tự động', 'auto', 'lịch', 'hẹn giờ'];
    const normalized = message.toLowerCase();
    return keywords.some(kw => normalized.includes(kw));
  }

  private isConfigurationRequest(message: string): boolean {
    const normalized = message.toLowerCase();
    
    // Check for explicit config intent
    if (normalized.includes('cài đặt') || normalized.includes('thiết lập') || normalized.includes('chỉnh')) {
      return true;
    }
    
    // If message contains "ngưỡng" (threshold), it's definitely config
    if (normalized.includes('ngưỡng')) return true;

    return false;
  }
}
