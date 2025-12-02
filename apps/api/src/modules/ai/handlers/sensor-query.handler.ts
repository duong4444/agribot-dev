import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import { Device, DeviceStatus, DeviceType } from '../../iot/entities/device.entity';
import { Area } from '../../farms/entities/area.entity';
import { SensorData } from '../../iot/entities/sensor-data.entity';
import { Entity } from '../types';

export interface SensorQueryResult {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable()
export class SensorQueryHandler {
  private readonly logger = new Logger(SensorQueryHandler.name);

  private readonly METRIC_MAP: Record<string, keyof SensorData> = {
    'nhiệt độ': 'temperature',
    'độ ẩm đất': 'soilMoisture',  // More specific, must come before 'độ ẩm'
    'độ ẩm của đất': 'soilMoisture',  // More specific, must come before 'độ ẩm'
    'độ ẩm không khí': 'humidity',
    'độ ẩm': 'humidity',
    'ánh sáng': 'lightLevel',
    'cường độ sáng': 'lightLevel',
    'độ sáng': 'lightLevel',
  };

  private readonly UNIT_MAP: Record<string, string> = {
    'temperature': '°C',
    'humidity': '%',
    'soilMoisture': '%',
    'lightLevel': ' lux',
  };

  private readonly LABEL_MAP: Record<string, string> = {
    'temperature': 'Nhiệt độ',
    'humidity': 'Độ ẩm không khí',
    'soilMoisture': 'Độ ẩm đất',
    'lightLevel': 'Ánh sáng',
  };

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(SensorData)
    private readonly sensorDataRepository: Repository<SensorData>,
  ) {}

  async handle(
    userId: string,
    entities: Entity[],
    message: string,
  ): Promise<SensorQueryResult> {
    // this.logger.log(`Handling sensor query for user ${userId}`);
    
    // Extract entities
    const areaEntity = entities.find(e => e.type === 'farm_area');
    const metricEntity = entities.find(e => e.type === 'metric');

    // Determine requested metric with improved matching
    let requestedMetric: keyof SensorData | null = null;
    if (metricEntity) {
      const normalizedMetric = metricEntity.value.toLowerCase().trim();
      
      // Try exact match first
      if (this.METRIC_MAP[normalizedMetric]) {
        requestedMetric = this.METRIC_MAP[normalizedMetric];
      } else {
        // If no exact match, find the longest key that is contained in the normalized metric
        // This prevents "độ ẩm" from matching when user says "độ ẩm đất"
        const matchingKeys = Object.keys(this.METRIC_MAP).filter(k => normalizedMetric.includes(k));
        if (matchingKeys.length > 0) {
          // Sort by length descending to get the longest match first
          const longestKey = matchingKeys.sort((a, b) => b.length - a.length)[0];
          requestedMetric = this.METRIC_MAP[longestKey];
        }
      }
    }

    try {
      if (areaEntity) {
        return await this.handleAreaQuery(userId, areaEntity.value, requestedMetric);
      } else {
        return await this.handleGeneralQuery(userId, requestedMetric);
      }
    } catch (error) {
      this.logger.error(`Error handling sensor query: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Xin lỗi, tôi gặp sự cố khi lấy dữ liệu cảm biến. Vui lòng thử lại sau.',
      };
    }
  }

  private async handleAreaQuery(
    userId: string,
    areaName: string,
    metric: keyof SensorData | null,
  ): Promise<SensorQueryResult> {
    // Find area with robust search strategy
    // 1. Try exact match
    let area = await this.areaRepository.findOne({
      where: { 
        name: areaName,
        farm: { userId }
      },
      relations: ['farm'],
    });

    // 2. If not found, try case-insensitive match
    if (!area) {
      area = await this.areaRepository.findOne({
        where: { 
          name: ILike(areaName),
          farm: { userId }
        },
        relations: ['farm'],
      });
    }

    // 3. If still not found, try matching partial name
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
       return {
         success: false,
         message: `Tôi không tìm thấy khu vực "${areaName}". Vui lòng kiểm tra lại tên khu vực.`,
       };
    }

    // Find active sensor nodes in area
    const devices = await this.deviceRepository.find({
      where: {
        areaId: area.id,
        type: DeviceType.SENSOR_NODE,
        status: DeviceStatus.ACTIVE,
      },
    });

    if (devices.length === 0) {
      return {
        success: false,
        message: `Khu vực "${area.name}" hiện chưa có thiết bị cảm biến nào đang hoạt động.`,
      };
    }

    // Get latest data for these devices
    const latestData = await this.getLatestDataForDevices(devices.map(d => d.serialNumber));

    if (!latestData) {
      return {
        success: false,
        message: `Hiện tại chưa có dữ liệu cảm biến từ khu vực "${area.name}".`,
      };
    }

    // Format response
    if (metric) {
      const value = latestData[metric];
      if (value === null || value === undefined) {
        return {
          success: false,
          message: `Không có dữ liệu về ${this.LABEL_MAP[metric] || metric} tại khu vực "${area.name}".`,
        };
      }
      return {
        success: true,
        message: `${this.LABEL_MAP[metric]} tại ${area.name} hiện tại là ${value}${this.UNIT_MAP[metric]}.`,
        data: { area: area.name, metric, value },
      };
    } else {
      // Return summary of all metrics
      const parts: string[] = [];
      if (latestData.temperature != null) parts.push(`Nhiệt độ: ${latestData.temperature}°C`);
      if (latestData.humidity != null) parts.push(`Độ ẩm: ${latestData.humidity}%`);
      if (latestData.soilMoisture != null) parts.push(`Độ ẩm đất: ${latestData.soilMoisture}%`);
      if (latestData.lightLevel != null) parts.push(`Ánh sáng: ${latestData.lightLevel} lux`);

      if (parts.length === 0) {
         return {
          success: false,
          message: `Dữ liệu cảm biến tại khu vực "${area.name}" không đầy đủ.`,
        };
      }

      return {
        success: true,
        message: `Thông số môi trường tại ${area.name}:\n- ${parts.join('\n- ')}`,
        data: latestData,
      };
    }
  }

  private async handleGeneralQuery(
    userId: string,
    metric: keyof SensorData | null,
  ): Promise<SensorQueryResult> {
    // Find all areas with sensors
    const areas = await this.areaRepository.find({
      where: { farm: { userId } },
      relations: ['devices'],
    });

    const activeAreas = areas.filter(a => 
      a.devices.some(d => d.type === DeviceType.SENSOR_NODE && d.status === DeviceStatus.ACTIVE)
    );

    if (activeAreas.length === 0) {
      return {
        success: false,
        message: 'Trang trại của bạn chưa có thiết bị cảm biến nào đang hoạt động.',
      };
    }

    if (activeAreas.length > 3 && !metric) {
      return {
        success: false,
        message: `Bạn có ${activeAreas.length} khu vực đang hoạt động. Vui lòng hỏi cụ thể khu vực nào để tôi báo cáo chi tiết hơn.`,
      };
    }

    // Collect data for each area
    const reports: string[] = [];
    for (const area of activeAreas) {
      const sensorDevices = area.devices.filter(d => d.type === DeviceType.SENSOR_NODE && d.status === DeviceStatus.ACTIVE);
      const data = await this.getLatestDataForDevices(sensorDevices.map(d => d.serialNumber));
      
      if (data) {
        if (metric) {
           const val = data[metric];
           if (val != null) {
             reports.push(`- ${area.name}: ${val}${this.UNIT_MAP[metric]}`);
           }
        } else {
           // Summary for area
           reports.push(`- ${area.name}: ${data.temperature}°C, ${data.humidity}%`);
        }
      }
    }

    if (reports.length === 0) {
      return {
        success: false,
        message: 'Không tìm thấy dữ liệu cảm biến nào.',
      };
    }

    const metricLabel = metric ? this.LABEL_MAP[metric] : 'Thông số';
    return {
      success: true,
      message: `Báo cáo ${metricLabel.toLowerCase()} hiện tại:\n${reports.join('\n')}`,
    };
  }

  private async getLatestDataForDevices(deviceIds: string[]): Promise<SensorData | null> {
    if (deviceIds.length === 0) return null;

    const latest = await this.sensorDataRepository.findOne({
      where: { deviceId: In(deviceIds) },
      order: { timestamp: 'DESC' },
    });

    return latest || null;
  }
}
