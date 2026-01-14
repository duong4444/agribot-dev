import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceAutoConfig } from '../entities/device-auto-config.entity';
import { Device, DeviceStatus } from '../entities/device.entity';
import { LightingEvent, LightingEventType, LightingEventStatus } from '../entities/lighting-event.entity';
import { MqttService } from '../mqtt.service';
import { IotGateway } from '../iot.gateway';

@Injectable()
export class LightingService {
  private readonly logger = new Logger(LightingService.name);

  constructor(
    @InjectRepository(DeviceAutoConfig)
    private configRepo: Repository<DeviceAutoConfig>,
    @InjectRepository(Device)
    private deviceRepo: Repository<Device>,
    @InjectRepository(LightingEvent)
    private eventRepo: Repository<LightingEvent>,
    @Inject(forwardRef(() => MqttService))
    private mqttService: MqttService,
    private iotGateway: IotGateway,
  ) {}

  async turnOn(deviceId: string, userId: string) {
    await this.validateDeviceAccess(deviceId, userId);
    
    // Log event
    await this.eventRepo.save(
      this.eventRepo.create({
        deviceId,
        type: LightingEventType.MANUAL_ON,
        status: LightingEventStatus.PENDING, // Wait for ESP32 confirmation
        timestamp: new Date(),
        userId,
        metadata: { action: 'manual_on' },
      }),
    );

    // Publish MQTT command
    await this.mqttService.publishCommand(deviceId, {
      action: 'turn_on_light',
    });

    this.logger.log(`User ${userId} turned ON light for device ${deviceId}`);
    return { success: true, message: 'Light ON command sent' };
  }

  async turnOff(deviceId: string, userId: string) {
    await this.validateDeviceAccess(deviceId, userId);

    // Log event
    await this.eventRepo.save(
      this.eventRepo.create({
        deviceId,
        type: LightingEventType.MANUAL_OFF,
        status: LightingEventStatus.PENDING, // Wait for ESP32 confirmation
        timestamp: new Date(),
        userId,
        metadata: { action: 'manual_off' },
      }),
    );

    // Publish MQTT command
    await this.mqttService.publishCommand(deviceId, {
      action: 'turn_off_light',
    });

    // Also disable auto mode in DB to stay in sync with device logic
    const config = await this.getOrCreateConfig(deviceId);
    if (config.lightEnabled) {
      config.lightEnabled = false;
      await this.configRepo.save(config);
    }

    this.logger.log(`User ${userId} turned OFF light for device ${deviceId}`);
    return { success: true, message: 'Light OFF command sent' };
  }

  async updateAutoConfig(deviceId: string, userId: string, config: { enabled?: boolean; threshold?: number }) {
    await this.validateDeviceAccess(deviceId, userId);

    const autoConfig = await this.getOrCreateConfig(deviceId);

    if (config.enabled !== undefined) autoConfig.lightEnabled = config.enabled;
    if (config.threshold !== undefined) autoConfig.lightThreshold = config.threshold;

    await this.configRepo.save(autoConfig);

    // Sync with Device via MQTT
    await this.mqttService.publishCommand(deviceId, {
      action: 'set_light_auto',
      enabled: autoConfig.lightEnabled,
      threshold: autoConfig.lightThreshold,
    });

    // Log event
    await this.eventRepo.save(
      this.eventRepo.create({
        deviceId,
        type: LightingEventType.AUTO_CONFIG_UPDATE,
        status: LightingEventStatus.PENDING, // Wait for ESP32 confirmation
        timestamp: new Date(),
        userId,
        metadata: { config },
      }),
    );

    this.logger.log(`Auto light config updated for device ${deviceId} by user ${userId}`);
    return autoConfig;
  }

  /**
   * Handle status updates from ESP32
   * Updates event status based on device events
   * Creates AUTO events when ESP32 triggers light changes via auto mode
   */
  async handleStatusUpdate(deviceId: string, status: any): Promise<void> {
    const { event, lightOn, manualLightControl } = status;

    this.logger.debug(`Lighting status update from ${deviceId}: ${event}`);

    // Find the most recent pending event (for manual commands)
    const recentEvent = await this.eventRepo.findOne({
      where: { deviceId, status: LightingEventStatus.PENDING },
      order: { timestamp: 'DESC' },
    });

    // Handle manual command ACKs (update PENDING events)
    if (recentEvent) {
      switch (event) {
        case 'light_on':
          recentEvent.status = LightingEventStatus.COMPLETED;
          break;

        case 'light_off':
          recentEvent.status = LightingEventStatus.COMPLETED;
          break;

        case 'light_auto_updated':
          recentEvent.status = LightingEventStatus.COMPLETED;
          break;

        case 'light_failed':
          recentEvent.status = LightingEventStatus.FAILED;
          break;
      }

      const savedEvent = await this.eventRepo.save(recentEvent);
      this.iotGateway.emitLightingEvent(deviceId, savedEvent);
      this.logger.log(`Lighting event updated: ${deviceId} - ${event} → ${recentEvent.status}`);
      return;
    }

    // No pending event → This might be an AUTO mode trigger
    // Create new AUTO event if light state changed
    if ((event === 'light_on' || event === 'light_off') && manualLightControl === false) {
      this.logger.log(`Auto mode triggered ${event} for ${deviceId}`);
      
      const autoEvent = this.eventRepo.create({
        deviceId,
        type: LightingEventType.AUTO,
        status: LightingEventStatus.COMPLETED,
        timestamp: new Date(),
        metadata: { 
          autoTrigger: true,
          lightOn: lightOn,
          event: event
        },
      });

      const savedAutoEvent = await this.eventRepo.save(autoEvent);
      this.iotGateway.emitLightingEvent(deviceId, savedAutoEvent);
      this.logger.log(`Auto lighting event created: ${deviceId} - ${event}`);
    }
  }

  async getAutoConfig(deviceId: string) {
    return this.getOrCreateConfig(deviceId);
  }

  private async getOrCreateConfig(deviceId: string): Promise<DeviceAutoConfig> {
    let config = await this.configRepo.findOne({ where: { deviceId } });
    if (!config) {
      config = this.configRepo.create({
        deviceId,
        lightEnabled: false,
        lightThreshold: 100,
      });
      await this.configRepo.save(config);
    }
    return config;
  }

  async getLightingHistory(
    deviceId: string,
    limit: number = 20,
  ): Promise<LightingEvent[]> {
    return this.eventRepo.find({
      where: { deviceId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  private async validateDeviceAccess(deviceId: string, userId: string) {
    const device = await this.deviceRepo.findOne({
      where: { serialNumber: deviceId },
      relations: ['area', 'area.farm'],
    });

    if (!device) throw new NotFoundException(`Device ${deviceId} not found`);
    if (device.status !== DeviceStatus.ACTIVE) throw new NotFoundException(`Device ${deviceId} is not active`);
    
    // Simple check: ensure device belongs to a farm owned by user
    if (device.area?.farm?.userId !== userId) {
      throw new NotFoundException(`Device ${deviceId} not found or access denied`);
    }
  }
}
