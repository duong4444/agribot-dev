import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import { Device, DeviceStatus, DeviceType } from '../../iot/entities/device.entity';
import { Area } from '../../farms/entities/area.entity';
import { IrrigationService } from '../../iot/services/irrigation.service';
import { LightingService } from '../../iot/services/lighting.service';
import { AckTrackerService } from '../../iot/services/ack-tracker.service';
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
    'chế độ tưới': 'pump',
    'chế độ tưới tự động': 'pump',
    
    // Light aliases
    'đèn': 'light',
    'bóng đèn': 'light',
    'đèn chiếu sáng': 'light',
  };

  // Action detection keywords
  private readonly ACTION_KEYWORDS = {
    on: ['bật', 'mở', 'khởi động', 'start', 'on', 'kích hoạt'],
    off: ['tắt', 'dừng', 'ngừng', 'stop', 'off', 'huỷ', 'hủy', 'vô hiệu hóa'],
  };

  // Response templates
  private readonly RESPONSE_TEMPLATES = {
    pump: {
      on_duration: 'Đã bật tưới {area} trong {duration}. Bạn có thể theo dõi lịch sử tưới tiêu trong trang điều khiển !',
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
    private readonly ackTrackerService: AckTrackerService,
  ) {}

  /**
   * Handle device control command from chatbot
   */
  async handle(
    userId: string,
    entities: Entity[],
    message: string,
  ): Promise<DeviceControlResult> {
    // this.logger.log(`Handling device control for user ${userId}`);
    this.logger.debug(`Entities: ${JSON.stringify(entities)}`);
    this.logger.debug(`Message: ${message}`);

    // Extract entities
    const deviceEntity = entities.find(e => e.type === 'device_name');
    const areaEntity = entities.find(e => e.type === 'farm_area');
    // Fallback: NER might label duration as 'date'
    const durationEntity = entities.find(e => e.type === 'duration' || e.type === 'date');

    if (!deviceEntity) {
      return {
        success: false,
        message: 'Vui lòng sử dụng Bảng điều khiển tại Farm Dashboard để thao tác chính xác hơn.',
        deviceType: 'unknown',
        area: 'unknown',
        action: 'unknown',
      };
    }

    if (!areaEntity) {
      return {
        success: false,
        message: 'Vui lòng sử dụng Bảng điều khiển tại Farm Dashboard để thao tác chính xác hơn.',
        deviceType: deviceEntity?.value || 'unknown',
        area: 'unknown',
        action: 'unknown',
      };
    }

    // Normalize device name
    const deviceType = this.normalizeDeviceName(deviceEntity.value);
    console.log("deviceType _ được normalize: ",deviceType);
    
    if (!deviceType) {
      return {
        success: false,
        message: `Vui lòng sử dụng Bảng điều khiển tại Farm Dashboard để thao tác.`,
        deviceType: deviceEntity.value,
        area: areaEntity?.value || 'unknown',
        action: 'unknown',
      };
    }

    // Detect action (on/off)
    const action = this.detectAction(message);
    console.log("action _từ detectAction: ",action);
    
    if (!action) {
      return {
        success: false,
        message: 'Vui lòng sử dụng Bảng điều khiển tại Farm Dashboard để thao tác chính xác hơn.',
        deviceType: deviceType,
        area: areaEntity?.value || 'unknown',
        action: 'unknown',
      };
    }

    // Parse duration if provided
    const duration = durationEntity ? this.parseDuration(durationEntity.value) : undefined;

    // Find area with error handling
    let area: Area;
    try {
      area = await this.findArea(areaEntity.value, userId);
      console.log("area _từ findArea: ", area);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        return {
          success: false,
          message: `Không tìm thấy khu vực "${areaEntity.value}" hoặc bạn không có quyền truy cập. Vui lòng sử dụng Bảng điều khiển tại Farm Dashboard để thao tác.`,
          deviceType: deviceType,
          area: areaEntity.value,
          action: action,
        };
      }
      throw error; // Re-throw unexpected errors
    }

    // Find device with error handling
    let device: Device;
    try {
      device = await this.findDevice(deviceType, area.id, userId);
      console.log("device _từ findDevice: ", device);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        const deviceNameVi = deviceType === 'pump' ? 'máy bơm' : 'đèn';
        return {
          success: false,
          message: `Không tìm thấy ${deviceNameVi} trong khu vực "${area.name}" hoặc bạn không có quyền điều khiển. Vui lòng sử dụng Bảng điều khiển tại Farm Dashboard để thao tác.`,
          deviceType: deviceType,
          area: area.name,
          action: action,
        };
      }
      throw error; // Re-throw unexpected errors
    }


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

    // Execute command (both auto-mode and manual control)
    if (isAutoModeRequest && deviceType === 'pump') {
       // Handle Auto Mode Toggle
       // set status là pending
       await this.irrigationService.updateAutoConfig(device.serialNumber, { enabled: action === 'on' }, userId);
    } else {
       // Manual Control
       console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
       
       await this.executeCommand(device, action, deviceType, duration);
    }
    
    // Wait for ACK with 6-second timeout (for ALL commands)
    try {
      const expectedAction = this.getExpectedAction(deviceType, action, duration, isAutoModeRequest);
      
      this.logger.debug(`Waiting for ACK: ${device.serialNumber} - ${expectedAction}`);
      
      const ack = await this.ackTrackerService.waitForAck(
        device.serialNumber,
        expectedAction,
        6000, // 6 seconds
      );
      
      if (ack.status === 'success') {
        // Success - device confirmed execution
        let response: string;
        if (isAutoModeRequest && deviceType === 'pump') {
          response = action === 'on' 
            ? `Đã bật chế độ tưới tự động cho ${area.name}`
            : `Đã tắt chế độ tưới tự động cho ${area.name}`;
        } else {
          response = this.formatResponse(deviceType, action, area.name, duration);
        }
        
        return {
          success: true,
          message: `${response}`,
          deviceType,
          area: area.name,
          action,
          duration,
        };
      } else {
        // Device reported failure
        return {
          success: false,
          message: `⚠️ Thiết bị báo lỗi: ${ack.message || 'Không thể thực thi lệnh'}`,
          deviceType,
          area: area.name,
          action,
        };
      }
    } catch (error) {
      // Timeout - no ACK received
      this.logger.warn(`ACK timeout for ${device.serialNumber}: ${error.message}`);
      
      return {
        success: false,
        message: `⚠️ Không nhận được phản hồi từ thiết bị. Vui lòng kiểm tra kết nối hoặc thử lại sau.`,
        deviceType,
        area: area.name,
        action,
      };
    }
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

    // 🔧 Match shorthand formats first (e.g., "5s", "10m", "1h")
    const shorthandSecondMatch = normalized.match(/^(\d+)\s*s$/);
    if (shorthandSecondMatch) {
      return parseInt(shorthandSecondMatch[1]);
    }

    const shorthandMinuteMatch = normalized.match(/^(\d+)\s*m$/);
    if (shorthandMinuteMatch) {
      return parseInt(shorthandMinuteMatch[1]) * 60;
    }

    const shorthandHourMatch = normalized.match(/^(\d+)\s*h$/);
    if (shorthandHourMatch) {
      return parseInt(shorthandHourMatch[1]) * 3600;
    }

    // 🔧 Match Vietnamese text with optional space (e.g., "5 giây", "5giây")
    const secondMatch = normalized.match(/(\d+)\s*giây/);
    if (secondMatch) {
      return parseInt(secondMatch[1]);
    }

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
    
    // Fallback: try to parse just number as seconds (not minutes!)
    const numberMatch = normalized.match(/^(\d+)$/);
    if (numberMatch) {
        return parseInt(numberMatch[1]); // Treat bare number as seconds
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
          console.log("DURATIONNNNNNNNNNNNNNNNNNNN");
          
          await this.irrigationService.irrigateDuration(deviceId, { duration }, userId);
        } else {
          console.log("MANUALLLLLLLLLLLLLLLLLL");
          
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

  /**
   * Get expected ACK action name based on command
   * Returns event names as defined in iot.txt
   */
  private getExpectedAction(
    deviceType: 'pump' | 'light',
    action: 'on' | 'off',
    duration?: number,
    isAutoMode?: boolean,
  ): string {
    // Auto-mode: ESP publishes 'auto_mode_updated' (same for on/off)
    if (isAutoMode && deviceType === 'pump') {
      return 'auto_mode_updated';
    }
    
    if (deviceType === 'pump') {
      // Duration: ESP publishes 'irrigation_started'
      if (duration) return 'irrigation_started';
      // Manual on/off: ESP publishes 'pump_on' or 'pump_off'
      return action === 'on' ? 'pump_on' : 'pump_off';
    } else {
      // Light: ESP publishes 'light_on' or 'light_off'
      return action === 'on' ? 'light_on' : 'light_off';
    }
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
