import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { SensorData } from './entities/sensor-data.entity';

@Injectable()
export class MqttService implements OnModuleInit {
  private client: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);

  constructor(
    @InjectRepository(SensorData)
    private sensorDataRepository: Repository<SensorData>,
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
      const data = JSON.parse(message);
      this.logger.debug(`Received data from ${topic}: ${message}`);

      // Save to database
      const sensorData = this.sensorDataRepository.create({
        deviceId: data.deviceId,
        temperature: data.temperature,
        humidity: data.humidity,
        soilMoisture: data.soilMoisture,
        lightLevel: data.lightLevel,
      });

      const saved = await this.sensorDataRepository.save(sensorData);
      this.logger.debug(`Saved sensor data with ID: ${saved.id}`);
    } catch (error) {
      this.logger.error(`Error processing message from ${topic}`, error);
    }
  }

  async getLatestSensorData() {
    // Get latest data for each device
    // This is a simplified query, for production might need more complex SQL
    return this.sensorDataRepository.find({
      order: { timestamp: 'DESC' },
      take: 10,
    });
  }
}
