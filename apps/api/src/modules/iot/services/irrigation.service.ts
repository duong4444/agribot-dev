import { Injectable, Logger, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceAutoConfig } from '../entities/device-auto-config.entity';
import {
  IrrigationEvent,
  IrrigationEventType,
  IrrigationEventStatus,
} from '../entities/irrigation-event.entity';
import { Device, DeviceStatus } from '../entities/device.entity';
import { SensorData } from '../entities/sensor-data.entity';
import { MqttService } from '../mqtt.service';
import { UpdateAutoConfigDto, IrrigateDurationDto } from '../dto/irrigation.dto';

@Injectable()
export class IrrigationService {
  private readonly logger = new Logger(IrrigationService.name);

  constructor(
    @InjectRepository(DeviceAutoConfig)
    private autoConfigRepo: Repository<DeviceAutoConfig>,
    @InjectRepository(IrrigationEvent)
    private eventRepo: Repository<IrrigationEvent>,
    @InjectRepository(Device)
    private deviceRepo: Repository<Device>,
    @InjectRepository(SensorData)
    private sensorDataRepo: Repository<SensorData>,
    @Inject(forwardRef(() => MqttService))
    private mqttService: MqttService,
  ) {}

  // ============================================================================
  // Manual Control
  // ============================================================================

  async turnOnPump(deviceId: string, userId: string): Promise<IrrigationEvent> {
    await this.validateDeviceAccess(deviceId, userId);
    console.log("turnONPump đc gọi nè ______ON");

    console.log("_______________________DEVICE_ID________________________: ",deviceId);
    
    // Get current soil moisture
    const soilMoisture = await this.getCurrentSoilMoisture(deviceId);

    // Create event log
    const event = this.eventRepo.create({
      deviceId,
      type: IrrigationEventType.MANUAL_ON,
      status: IrrigationEventStatus.PENDING,
      startTime: new Date(),
      soilMoistureBefore: soilMoisture ?? undefined,
      userId,
      metadata: { action: 'manual_on' },
    });
    console.log("===================================================");
    console.log("EVENT___IrrigationEvent: ",event);
    console.log("===================================================");
    
    await this.eventRepo.save(event);

    // Publish MQTT command
    console.log("----------irrigation.service gọi pushCMD của mqtt.service----------");
    
    await this.mqttService.publishCommand(deviceId, {
      action: 'turn_on',
      component: 'pump',
      timestamp: Date.now(),
    });

    this.logger.log(`Pump turned ON for device ${deviceId} by user ${userId}`);
    return event;
  }

  async turnOffPump(deviceId: string, userId: string): Promise<IrrigationEvent> {
    await this.validateDeviceAccess(deviceId, userId);
    console.log("turnOffPump đc gọi nè _________OFF");
    
    const soilMoisture = await this.getCurrentSoilMoisture(deviceId);

    const event = this.eventRepo.create({
      deviceId,
      type: IrrigationEventType.MANUAL_OFF,
      status: IrrigationEventStatus.COMPLETED,
      startTime: new Date(),
      endTime: new Date(),
      soilMoistureAfter: soilMoisture ?? undefined,
      userId,
      metadata: { action: 'manual_off' },
    });

    await this.eventRepo.save(event);

    await this.mqttService.publishCommand(deviceId, {
      action: 'turn_off',
      component: 'pump',
      timestamp: Date.now(),
    });

    this.logger.log(`Pump turned OFF for device ${deviceId} by user ${userId}`);
    return event;
  }

  // ============================================================================
  // Duration-based Irrigation
  // ============================================================================

  async irrigateDuration(
    deviceId: string,
    dto: IrrigateDurationDto,
    userId: string,
  ): Promise<IrrigationEvent> {
    await this.validateDeviceAccess(deviceId, userId);

    const soilMoisture = await this.getCurrentSoilMoisture(deviceId);

    const event = this.eventRepo.create({
      deviceId,
      type: IrrigationEventType.DURATION,
      status: IrrigationEventStatus.PENDING,
      startTime: new Date(),
      plannedDuration: dto.duration,
      soilMoistureBefore: soilMoisture ?? undefined,
      userId,
      metadata: { duration: dto.duration },
    });

    await this.eventRepo.save(event);

    await this.mqttService.publishCommand(deviceId, {
      action: 'irrigate',
      duration: dto.duration,
      timestamp: Date.now(),
    });

    this.logger.log(
      `Duration irrigation started for device ${deviceId}: ${dto.duration}s by user ${userId}`,
    );
    return event;
  }

  // ============================================================================
  // Auto Mode Configuration
  // ============================================================================

  async getAutoConfig(deviceId: string): Promise<DeviceAutoConfig> {
    let config = await this.autoConfigRepo.findOne({ where: { deviceId } });

    // Create default config if not exists
    if (!config) {
      config = this.autoConfigRepo.create({
        deviceId,
        enabled: false,
        moistureThreshold: 30.0,
        irrigationDuration: 600,
        cooldownPeriod: 3600,
      });
      await this.autoConfigRepo.save(config);
    }

    return config;
  }

  async updateAutoConfig(
    deviceId: string,
    dto: UpdateAutoConfigDto,
    userId: string,
  ): Promise<DeviceAutoConfig> {
    await this.validateDeviceAccess(deviceId, userId);

    let config = await this.getAutoConfig(deviceId);

    // Update fields
    if (dto.enabled !== undefined) config.enabled = dto.enabled;
    if (dto.moistureThreshold !== undefined)
      config.moistureThreshold = dto.moistureThreshold;
    if (dto.irrigationDuration !== undefined)
      config.irrigationDuration = dto.irrigationDuration;
    if (dto.cooldownPeriod !== undefined)
      config.cooldownPeriod = dto.cooldownPeriod;

    await this.autoConfigRepo.save(config);

    // Publish to ESP32
    await this.mqttService.publishCommand(deviceId, {
      action: 'set_auto_mode',
      enabled: config.enabled,
      threshold: config.moistureThreshold,
      duration: config.irrigationDuration,
      cooldown: config.cooldownPeriod,
      timestamp: Date.now(),
    });

    // Log event
    await this.eventRepo.save(
      this.eventRepo.create({
        deviceId,
        type: IrrigationEventType.AUTO_CONFIG_UPDATE,
        status: IrrigationEventStatus.COMPLETED,
        startTime: new Date(),
        endTime: new Date(),
        userId,
        metadata: { config: dto },
      }),
    );

    this.logger.log(`Auto config updated for device ${deviceId} by user ${userId}`);
    return config;
  }

  async toggleAutoMode(
    deviceId: string,
    enabled: boolean,
    userId: string,
  ): Promise<DeviceAutoConfig> {
    return this.updateAutoConfig(deviceId, { enabled }, userId);
  }

  // ============================================================================
  // Event History & Stats
  // ============================================================================

  async getIrrigationHistory(
    deviceId: string,
    limit: number = 20,
  ): Promise<IrrigationEvent[]> {
    return this.eventRepo.find({
      where: { deviceId },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async getIrrigationStats(
    deviceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const events = await this.eventRepo
      .createQueryBuilder('event')
      .where('event.deviceId = :deviceId', { deviceId })
      .andWhere('event.startTime >= :startDate', { startDate })
      .andWhere('event.startTime <= :endDate', { endDate })
      .getMany();

    const totalEvents = events.length;
    const manualEvents = events.filter(
      (e) =>
        e.type === IrrigationEventType.MANUAL_ON ||
        e.type === IrrigationEventType.MANUAL_OFF ||
        e.type === IrrigationEventType.DURATION,
    ).length;
    const autoEvents = events.filter(
      (e) => e.type === IrrigationEventType.AUTO,
    ).length;

    const totalDuration = events
      .filter((e) => e.actualDuration || e.plannedDuration)
      .reduce((sum, e) => sum + (e.actualDuration || e.plannedDuration || 0), 0);

    return {
      totalEvents,
      manualEvents,
      autoEvents,
      totalDuration,
      averageDuration: totalEvents > 0 ? totalDuration / totalEvents : 0,
      events,
    };
  }

  // ============================================================================
  // Handle Status Updates from ESP32
  // ============================================================================

  async handleStatusUpdate(deviceId: string, status: any): Promise<void> {
    const { event, pumpOn, soilMoisture } = status;

    this.logger.debug(`Status update from ${deviceId}: ${event}`);

    // Find the most recent pending/running event
    const recentEvent = await this.eventRepo.findOne({
      where: [
        { deviceId, status: IrrigationEventStatus.PENDING },
        { deviceId, status: IrrigationEventStatus.RUNNING },
      ],
      order: { startTime: 'DESC' },
    });

    console.log("recentEvent: ",recentEvent);
    

    if (!recentEvent) {
      // No pending event, might be auto irrigation
      if (event === 'auto_irrigation_triggered') {
        await this.eventRepo.save(
          this.eventRepo.create({
            deviceId,
            type: IrrigationEventType.AUTO,
            status: IrrigationEventStatus.RUNNING,
            startTime: new Date(),
            plannedDuration: status.duration,
            soilMoistureBefore: soilMoisture,
            metadata: { threshold: status.threshold },
          }),
        );
      }
      return;
    }

    // Update event based on status
    switch (event) {
      case 'pump_on':
      case 'irrigation_started':
        recentEvent.status = IrrigationEventStatus.RUNNING;
        break;

      case 'pump_off':
      case 'irrigation_completed':
        recentEvent.status = IrrigationEventStatus.COMPLETED;
        recentEvent.endTime = new Date();
        recentEvent.soilMoistureAfter = soilMoisture;
        if (status.duration) {
          recentEvent.actualDuration = status.duration;
        }
        break;

      case 'irrigation_failed':
        recentEvent.status = IrrigationEventStatus.FAILED;
        recentEvent.endTime = new Date();
        break;
    }

    await this.eventRepo.save(recentEvent);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  // check device đang req có tồn tại trong bảng devices không
  // check device active? , device thuộc farm|area 
  // check req user với chủ sở hữu device
  private async validateDeviceAccess(
    deviceId: string,
    userId: string,
  ): Promise<Device> {
    this.logger.debug(`[validateDeviceAccess] Checking device: ${deviceId}, userId: ${userId}`);
    
    console.log("________LOG trong validateDeviceAccess___________");
    
    const device = await this.deviceRepo.findOne({
      where: { serialNumber: deviceId }, // Query by serialNumber, not UUID
      relations: ['area', 'area.farm'],
    });

    this.logger.debug(`[validateDeviceAccess] Device found: ${JSON.stringify({
      id: device?.id,
      serialNumber: device?.serialNumber,
      status: device?.status,
      areaId: device?.areaId,
      hasArea: !!device?.area,
      hasFarm: !!device?.area?.farm,
      farmUserId: device?.area?.farm?.userId,
    })}` );

    if (!device) {
      this.logger.warn(`[validateDeviceAccess] Device NOT FOUND: ${deviceId}`);
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    if (device.status !== DeviceStatus.ACTIVE) {
      this.logger.warn(`[validateDeviceAccess] Device NOT ACTIVE: ${deviceId}, status: ${device.status}`);
      throw new ForbiddenException(`Device ${deviceId} is not active`);
    }

    if (!device.area || !device.area.farm) {
      this.logger.warn(`[validateDeviceAccess] Device NOT ASSIGNED to farm: ${deviceId}, areaId: ${device.areaId}`);
      throw new ForbiddenException(`Device ${deviceId} is not assigned to a farm`);
    }

    if (device.area.farm.userId !== userId) {
      this.logger.warn(`[validateDeviceAccess] ACCESS DENIED: device farmUserId=${device.area.farm.userId}, requestUserId=${userId}`);
      throw new ForbiddenException(
        `You do not have access to device ${deviceId}`,
      );
    }

    this.logger.debug(`PASS!!!!_____[validateDeviceAccess] Access GRANTED for device: ${deviceId}`);
    return device;
  }

  private async getCurrentSoilMoisture(deviceId: string): Promise<number | null> {
    const latestData = await this.sensorDataRepo.findOne({
      where: { deviceId },
      order: { timestamp: 'DESC' },
    });

    return latestData?.soilMoisture || null;
  }
}
