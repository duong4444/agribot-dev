import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { SensorData } from './entities/sensor-data.entity';
import { Device, DeviceStatus } from './entities/device.entity';

@Injectable()
export class MqttService implements OnModuleInit {
  private client: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);

  constructor(
    @InjectRepository(SensorData)
    private sensorDataRepository: Repository<SensorData>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  onModuleInit() {
    this.connectToBroker();
  }

  private connectToBroker() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    
    this.client = mqtt.connect(brokerUrl);

    this.client.on('connect', () => {
      this.logger.log(`Connected to MQTT Broker at ${brokerUrl}`);
      this.subscribeToTopics();
    });

    this.client.on('error', (err) => {
      this.logger.error('MQTT Connection Error', err);
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message.toString());
    });
  }

  private subscribeToTopics() {
    const topic = 'sensors/+/data';
    this.client.subscribe(topic, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to ${topic}`, err);
      } else {
        this.logger.log(`Subscribed to ${topic}`);
      }
    });
  }

  private async handleMessage(topic: string, message: string) {
    try {
      const payload = JSON.parse(message);
      this.logger.debug(`Received data from ${topic}: ${message}`);

      // Extract serial number from payload (assuming deviceId is the serial number)
      const serialNumber = payload.deviceId;

      if (!serialNumber) {
        this.logger.warn('Received message without deviceId');
        return;
      }

      // Find device - NO AUTO-CREATE, device must be activated by technician
      const device = await this.deviceRepository.findOne({
        where: { serialNumber },
      });

      if (!device) {
        this.logger.warn(`Unauthorized device attempted to publish: ${serialNumber}`);
        return; // Reject data from unregistered devices
      }

      // Security check: Only accept data from ACTIVE devices
      if (device.status !== DeviceStatus.ACTIVE) {
        this.logger.warn(`Inactive device attempted to publish: ${serialNumber} (status: ${device.status})`);
        return; // Reject data from non-active devices
      }

      // Save sensor data
      const sensorData = this.sensorDataRepository.create({
        deviceId: serialNumber,
        deviceInternalId: device.id,
        temperature: payload.temperature,
        humidity: payload.humidity,
        soilMoisture: payload.soilMoisture,
        lightLevel: payload.lightLevel,
        device: device,
      });

      const saved = await this.sensorDataRepository.save(sensorData);
      this.logger.debug(`Saved sensor data with ID: ${saved.id}`);
    } catch (error) {
      this.logger.error(`Error processing message from ${topic}`, error);
    }
  }

  async getLatestSensorData(userId: string, areaId?: string) {
    const query = this.sensorDataRepository.createQueryBuilder('data')
      .leftJoinAndSelect('data.device', 'device')
      .leftJoinAndSelect('device.area', 'area')
      .leftJoinAndSelect('area.farm', 'farm')
      .where('farm.userId = :userId', { userId })
      .orderBy('data.timestamp', 'DESC')
      .take(10);

    if (areaId) {
      query.andWhere('device.areaId = :areaId', { areaId });
    }

    return query.getMany();
  }
}
