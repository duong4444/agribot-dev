import { ConfigService } from '@nestjs/config';

export interface MqttConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
  clientId: string;
  options: {
    clean: boolean;
    connectTimeout: number;
    reconnectPeriod: number;
    keepalive: number;
  };
}

export const getMqttConfig = (configService: ConfigService): MqttConfig => ({
  brokerUrl: configService.get<string>('MQTT_BROKER_URL', 'mqtt://localhost:1883'),
  username: configService.get<string>('MQTT_USERNAME'),
  password: configService.get<string>('MQTT_PASSWORD'),
  clientId: `agri-chatbot-${Date.now()}`,
  options: {
    clean: true,
    connectTimeout: 30 * 1000,
    reconnectPeriod: 1000,
    keepalive: 60,
  },
});

export const mqttTopics = {
  SENSOR_DATA: 'sensors/+/data',
  SENSOR_STATUS: 'sensors/+/status',
  DEVICE_CONTROL: 'devices/+/control',
  IRRIGATION_CONTROL: 'irrigation/+/control',
  PUMP_CONTROL: 'pump/+/control',
  SYSTEM_STATUS: 'system/status',
} as const;
