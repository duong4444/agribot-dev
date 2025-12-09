import {
  Injectable,
  OnModuleInit,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import * as dotenv from 'dotenv';
import { SensorData } from './entities/sensor-data.entity';
import { Device, DeviceStatus } from './entities/device.entity';
import { IrrigationService } from './services/irrigation.service';
import { LightingService } from './services/lighting.service';

dotenv.config();

@Injectable()
export class MqttService implements OnModuleInit {
  private client: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);

  constructor(
    @InjectRepository(SensorData)
    private sensorDataRepository: Repository<SensorData>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @Inject(forwardRef(() => IrrigationService))
    private irrigationService: IrrigationService,
    @Inject(forwardRef(() => LightingService))
    private lightingService: LightingService,
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

    // khi nhận đc message từ topic đã subcribe
    this.client.on('message', (topic, message) => {
      if (topic.includes('/status')) {
        this.handleStatusMessage(topic, message.toString());
      } else {
        this.handleMessage(topic, message.toString());
      }
    });
  }

  // connect đến broker
  // thành công thì subcribe đến topic: data || status
  // nhận đc message từ topic:
  // check ESP_key === BE_key
  // check device.serialNum có trong bảng devices(technician add ) chưa
  // check device status active ?
  // pass hết thì save data vào sensor_data
  //

  private subscribeToTopics() {
    const dataTopic = 'sensors/+/data';
    const statusTopic = 'sensors/+/status';

    this.client.subscribe(dataTopic, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to ${dataTopic}`, err);
      } else {
        this.logger.log(`Subscribed to ${dataTopic}`);
      }
    });

    this.client.subscribe(statusTopic, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to ${statusTopic}`, err);
      } else {
        this.logger.log(`Subscribed to ${statusTopic}`);
      }
    });
  }

  private async handleMessage(topic: string, message: string) {
    try {
      const payload = JSON.parse(message);
      console.log(
        '===========================================================================',
      );
      console.log(' ');

      console.log(
        '--------- bắt đầu handleMessage của sensor data trong mqtt.service -------- ',
      );

      console.log('PAYLOAD từ ESP_ nhận phía MQTT.service: ', payload);
      console.log('........................................................');
      console.log(
        'PAYLOAD.secret từ ESP_ nhận phía MQTT.service: ',
        payload.secret,
      );

      this.logger.debug(
        `Received data from \n----------------------\n${topic}\n----------------\n: ====================\n${message}\n===========================`,
      );

      // Security check: Validate secret token
      const expectedSecret = process.env.MQTT_SECRET;
      console.log('expectedSecret_mqtt.service: ', expectedSecret);

      if (!expectedSecret) {
        this.logger.warn('MQTT_SECRET is not defined in .env');
      } else if (payload.secret !== expectedSecret) {
        this.logger.warn(
          `Unauthorized publish attempt on ${topic}: secret mismatch`,
        );
        return; // Reject message with invalid secret
      }

      // Extract serial number from payload (assuming deviceId is the serial number)
      const serialNumber = payload.deviceId;

      if (!serialNumber) {
        this.logger.warn('Received message without deviceId');
        return;
      }

      // Find device - NO AUTO-CREATE, device must be activated by technician
      const device = await this.deviceRepository.findOne({
        where: { serialNumber },
        relations: ['area', 'area.farm', 'area.farm.user'], // Load owner info
      });

      if (!device) {
        this.logger.warn(
          `Unauthorized device attempted to publish: ${serialNumber}`,
        );
        return; // Reject data from unregistered devices
      }

      // Check Subscription Status
      // If user is PREMIUM but INACTIVE (expired), do not save data
      const owner = device.area?.farm?.user;
      if (owner) {
        if (owner.plan === 'PREMIUM' && owner.subscriptionStatus === 'INACTIVE') {
          this.logger.warn(
            `Dropped data from ${serialNumber} because owner ${owner.email} has expired subscription.`,
          );
          return;
        }
      }

      // Security check: Only accept data from ACTIVE devices
      if (device.status !== DeviceStatus.ACTIVE) {
        this.logger.warn(
          `Inactive device attempted to publish: ${serialNumber} (status: ${device.status})`,
        );
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
      this.logger.debug(
        `____________________Saved sensor data with ID_________________: ${saved.id}`,
      );
      console.log('  ');

      console.log(
        '=========================================================================================',
      );
    } catch (error) {
      this.logger.error(`Error processing message from ${topic}`, error);
    }
  }

  private async handleStatusMessage(topic: string, message: string) {
    try {
      console.log("=======handleStatusMessage===========");
      
      const payload = JSON.parse(message);
      console.log('================XỬ LÝ handleStatusMessage============');
      console.log('payload_từ topic status: ', payload);
      console.log('==========================================================');

      const serialNumber = payload.deviceId;

      if (!serialNumber) {
        this.logger.warn('Received status message without deviceId');
        return;
      }

      this.logger.log(
        `Received status update from ${serialNumber}: ${payload.event}`,
      );

      // Delegate to IrrigationService
      await this.irrigationService.handleStatusUpdate(serialNumber, payload);

      // Handle Lighting Status
      if (payload.event === 'light_auto_mode_disabled_by_manual_off') {
        this.logger.log(
          `Auto light disabled by manual OFF for ${serialNumber}`,
        );
        await this.lightingService.updateAutoConfig(serialNumber, 'SYSTEM', {
          enabled: false,
        });
      }
      console.log("============endlog____handleStatusMessage================");
      
    } catch (error) {
      this.logger.error(`Error processing status message from ${topic}`, error);
    }
  }

  // ============================================================================
  // Publish Control Commands
  // ============================================================================

  async publishCommand(serialNumber: string, command: any): Promise<void> {
    const topic = `control/${serialNumber}/command`;
    const payload = JSON.stringify({
      ...command,
      secret: process.env.MQTT_SECRET,
    });

    console.log('=============================================');
    console.log('||____PAYLOAD____mqtt.service___:  ', payload);
    console.log('=============================================');

    return new Promise((resolve, reject) => {
      this.client.publish(topic, payload, (err) => {
        if (err) {
          this.logger.error(`Failed to publish command to ${topic}`, err);
          reject(err);
        } else {
          this.logger.log(
            `Published command to ---- ${topic} ----:${command.action}======`,
          );
          resolve();
        }
      });
    });
  }

  async getLatestSensorData(userId: string, areaId?: string) {
    const query = this.sensorDataRepository
      .createQueryBuilder('data')
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
