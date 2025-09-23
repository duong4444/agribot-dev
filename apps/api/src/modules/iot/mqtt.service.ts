import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface MqttMessage {
  topic: string;
  payload: string;
  timestamp: Date;
}

export interface SensorData {
  deviceId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: any;
}

export interface DeviceCommand {
  deviceId: string;
  command: string;
  parameters?: any;
  timestamp: Date;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;
  private isConnected = false;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      const mqttUrl = this.configService.get<string>('MQTT_URL', 'mqtt://localhost:1883');
      const mqttUsername = this.configService.get<string>('MQTT_USERNAME');
      const mqttPassword = this.configService.get<string>('MQTT_PASSWORD');

      const options: mqtt.IClientOptions = {
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
        keepalive: 60,
      };

      if (mqttUsername && mqttPassword) {
        options.username = mqttUsername;
        options.password = mqttPassword;
      }

      this.client = mqtt.connect(mqttUrl, options);

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Connected to MQTT broker');
        this.subscribeToTopics();
      });

      this.client.on('error', (error) => {
        this.logger.error('MQTT connection error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.logger.warn('MQTT connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        this.logger.log('Reconnecting to MQTT broker...');
      });

      this.client.on('message', (topic, payload) => {
        this.handleMessage(topic, payload);
      });

    } catch (error) {
      this.logger.error('Failed to connect to MQTT broker:', error);
    }
  }

  private async disconnect() {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      this.logger.log('Disconnected from MQTT broker');
    }
  }

  private subscribeToTopics() {
    const topics = [
      'sensors/+/data',      // sensors/{deviceId}/data
      'devices/+/status',    // devices/{deviceId}/status
      'devices/+/response',  // devices/{deviceId}/response
      'alerts/+',            // alerts/{deviceId}
    ];

    topics.forEach(topic => {
      this.client.subscribe(topic, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          this.logger.log(`Subscribed to ${topic}`);
        }
      });
    });
  }

  private handleMessage(topic: string, payload: Buffer) {
    try {
      const message: MqttMessage = {
        topic,
        payload: payload.toString(),
        timestamp: new Date(),
      };

      this.logger.debug(`Received MQTT message: ${topic} - ${message.payload}`);

      // Parse topic to determine message type
      const topicParts = topic.split('/');
      
      if (topicParts[0] === 'sensors' && topicParts[2] === 'data') {
        this.handleSensorData(topicParts[1], message);
      } else if (topicParts[0] === 'devices' && topicParts[2] === 'status') {
        this.handleDeviceStatus(topicParts[1], message);
      } else if (topicParts[0] === 'devices' && topicParts[2] === 'response') {
        this.handleDeviceResponse(topicParts[1], message);
      } else if (topicParts[0] === 'alerts') {
        this.handleAlert(topicParts[1], message);
      }

    } catch (error) {
      this.logger.error('Error handling MQTT message:', error);
    }
  }

  private handleSensorData(deviceId: string, message: MqttMessage) {
    try {
      const data = JSON.parse(message.payload);
      const sensorData: SensorData = {
        deviceId,
        sensorType: data.type || 'unknown',
        value: data.value,
        unit: data.unit || '',
        timestamp: new Date(data.timestamp || message.timestamp),
        metadata: data.metadata,
      };

      // Emit event for sensor data
      this.eventEmitter.emit('sensor.data', sensorData);
      
    } catch (error) {
      this.logger.error('Error parsing sensor data:', error);
    }
  }

  private handleDeviceStatus(deviceId: string, message: MqttMessage) {
    try {
      const data = JSON.parse(message.payload);
      
      // Emit event for device status update
      this.eventEmitter.emit('device.status', {
        deviceId,
        status: data.status,
        state: data.state,
        timestamp: new Date(data.timestamp || message.timestamp),
      });
      
    } catch (error) {
      this.logger.error('Error parsing device status:', error);
    }
  }

  private handleDeviceResponse(deviceId: string, message: MqttMessage) {
    try {
      const data = JSON.parse(message.payload);
      
      // Emit event for device command response
      this.eventEmitter.emit('device.response', {
        deviceId,
        commandId: data.commandId,
        success: data.success,
        response: data.response,
        timestamp: new Date(data.timestamp || message.timestamp),
      });
      
    } catch (error) {
      this.logger.error('Error parsing device response:', error);
    }
  }

  private handleAlert(deviceId: string, message: MqttMessage) {
    try {
      const data = JSON.parse(message.payload);
      
      // Emit event for alert
      this.eventEmitter.emit('device.alert', {
        deviceId,
        alertType: data.type,
        message: data.message,
        severity: data.severity || 'warning',
        timestamp: new Date(data.timestamp || message.timestamp),
      });
      
    } catch (error) {
      this.logger.error('Error parsing alert:', error);
    }
  }

  // Public methods for sending commands
  async sendDeviceCommand(command: DeviceCommand): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.error('MQTT client not connected');
      return false;
    }

    try {
      const topic = `devices/${command.deviceId}/command`;
      const payload = JSON.stringify({
        command: command.command,
        parameters: command.parameters,
        timestamp: command.timestamp,
      });

      this.client.publish(topic, payload, (err) => {
        if (err) {
          this.logger.error(`Failed to send command to ${command.deviceId}:`, err);
        } else {
          this.logger.log(`Command sent to ${command.deviceId}: ${command.command}`);
        }
      });

      return true;
    } catch (error) {
      this.logger.error('Error sending device command:', error);
      return false;
    }
  }

  async requestSensorData(deviceId: string, sensorType?: string): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.error('MQTT client not connected');
      return false;
    }

    try {
      const topic = `sensors/${deviceId}/request`;
      const payload = JSON.stringify({
        type: sensorType || 'all',
        timestamp: new Date(),
      });

      this.client.publish(topic, payload, (err) => {
        if (err) {
          this.logger.error(`Failed to request sensor data from ${deviceId}:`, err);
        } else {
          this.logger.log(`Sensor data requested from ${deviceId}`);
        }
      });

      return true;
    } catch (error) {
      this.logger.error('Error requesting sensor data:', error);
      return false;
    }
  }

  isMqttConnected(): boolean {
    return this.isConnected;
  }
}
