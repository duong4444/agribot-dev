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
import { AckTrackerService } from './services/ack-tracker.service';
import { IotGateway } from './iot.gateway';

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
    private ackTrackerService: AckTrackerService,
    private iotGateway: IotGateway,
  ) {}

  onModuleInit() {
    this.connectToBroker();
  }

  private connectToBroker() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const username = process.env.MQTT_USERNAME;
    const password = process.env.MQTT_PASSWORD;

    // Configure connection options
    const options: any = {
      clientId: `backend_${Math.random().toString(16).slice(3)}`,
      clean: true,
      reconnectPeriod: 1000,
    };

    // Add authentication if credentials provided
    if (username && password) {
      options.username = username;
      options.password = password;
      this.logger.log('MQTT authentication configured');
    }

    // For MQTTS (TLS), add TLS options
    if (brokerUrl.startsWith('mqtts://')) {
      options.rejectUnauthorized = true; // Verify server certificate
      this.logger.log('MQTT TLS/SSL enabled');
    }

    this.client = mqtt.connect(brokerUrl, options);

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
      
      //Emit sensor data to WebSocket
      this.iotGateway.emitSensorData(serialNumber, saved);
      
      // 🆕 Update device heartbeat
      device.lastSeenAt = new Date();
      await this.deviceRepository.save(device);
      this.logger.debug(`💓 Heartbeat updated for device ${device.serialNumber}`);
      
      console.log('  ');

      console.log(
        '=========================================================================================',
      );
    } catch (error) {
      this.logger.error(`Error processing message from ${topic}`, error);
    }
  }

  /**
   * Handle status messages from devices
   * - ACK for control commands (via 'event' field per iot.txt)
   * - Status updates for irrigation/lighting events
   * Topic format: sensors/{deviceId}/status
   */
  private async handleStatusMessage(topic: string, message: string) {
    try {
      console.log("=======handleStatusMessage===========");
      
      const payload = JSON.parse(message);
      console.log('================XỬ LÝ handleStatusMessage============');
      console.log('payload_từ topic status: ', payload);
      console.log('==========================================================');

      // Extract device ID from topic OR payload
      const parts = topic.split('/');
      const deviceIdFromTopic = parts.length >= 2 ? parts[1] : null;
      const serialNumber = payload.deviceId || deviceIdFromTopic;

      if (!serialNumber) {
        this.logger.warn('Received status message without deviceId');
        return;
      }

      // 🆕 Handle ACK for control commands (using 'event' field per iot.txt)
      // Map event names to ACK actions (1:1 mapping)
      if (payload.event) {
        const eventToActionMap: Record<string, string> = {
          'pump_on': 'pump_on',
          'pump_off': 'pump_off',
          'irrigation_started': 'irrigation_started',
          'irrigation_completed': 'irrigation_completed',
          'auto_mode_updated': 'auto_mode_updated',
          'light_on': 'light_on',
          'light_off': 'light_off',
          'light_auto_updated': 'light_auto_updated',
        };
        
        const ackAction = eventToActionMap[payload.event];
        
        if (ackAction) {
          this.ackTrackerService.receiveAck({
            deviceId: serialNumber,
            action: ackAction,
            status: 'success', // ESP events are always success (failure would not publish)
            timestamp: new Date(),
            message: payload.event,
          });
          
          this.logger.log(`✅ ACK received from ${serialNumber}: ${payload.event} → ${ackAction}`);
        }
      }

      // Existing logic: Handle irrigation/lighting events
      if (payload.event) {
        this.logger.log(
          `Received status update from ${serialNumber}: ${payload.event}`,
        );

        // Delegate to IrrigationService
        await this.irrigationService.handleStatusUpdate(serialNumber, payload);

        // Delegate to LightingService
        await this.lightingService.handleStatusUpdate(serialNumber, payload);

        // Handle Lighting Status
        if (payload.event === 'light_auto_mode_disabled_by_manual_off') {
          this.logger.log(
            `Auto light disabled by manual OFF for ${serialNumber}`,
          );
          await this.lightingService.updateAutoConfig(serialNumber, 'SYSTEM', {
            enabled: false,
          });
        }
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
    console.log("-----------------------------------------------");
    
    console.log('||____PAYLOAD____mqtt.service___:\n  ', payload);
    console.log("-----------------------------------------------");

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

    const results = await query.getMany();
    
    // 🆕 Add freshness info to each data point
    return results.map(data => {
      const now = new Date().getTime();
      const dataTime = new Date(data.timestamp).getTime();
      const minutesAgo = Math.floor((now - dataTime) / 60000);
      const isFresh = minutesAgo < 5;
      
      return {
        ...data,
        isFresh,
        minutesAgo,
      };
    });
  }
}
