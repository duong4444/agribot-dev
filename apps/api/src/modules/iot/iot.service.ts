import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Sensor, SensorType, SensorStatus } from './entities/sensor.entity';
import { Device, DeviceType, DeviceStatus } from './entities/device.entity';
import { SensorReading } from './entities/sensor-reading.entity';
import { DeviceCommand, CommandStatus } from './entities/device-command.entity';
import { MqttService, SensorData, DeviceCommand as MqttDeviceCommand } from './mqtt.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class IotService {
  private readonly logger = new Logger(IotService.name);

  constructor(
    @InjectRepository(Sensor)
    private sensorRepository: Repository<Sensor>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(SensorReading)
    private sensorReadingRepository: Repository<SensorReading>,
    @InjectRepository(DeviceCommand)
    private deviceCommandRepository: Repository<DeviceCommand>,
    private mqttService: MqttService,
    private eventEmitter: EventEmitter2,
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for sensor data from MQTT
    this.eventEmitter.on('sensor.data', async (sensorData: SensorData) => {
      await this.processSensorData(sensorData);
    });

    // Listen for device status updates
    this.eventEmitter.on('device.status', async (statusData: any) => {
      await this.updateDeviceStatus(statusData);
    });

    // Listen for device command responses
    this.eventEmitter.on('device.response', async (responseData: any) => {
      await this.updateCommandStatus(responseData);
    });
  }

  // Sensor Management
  async createSensor(createSensorDto: any, user: User): Promise<Sensor> {
    const sensorData = {
      ...createSensorDto,
    };

    return await this.sensorRepository.save(sensorData);
  }

  async getSensorsByFarm(farmId: string, user: User): Promise<Sensor[]> {
    return await this.sensorRepository.find({
      where: { farmId, farm: { userId: user.id } },
      relations: ['farm'],
    });
  }

  async getSensorById(id: string, user: User): Promise<Sensor> {
    const sensor = await this.sensorRepository.findOne({
      where: { id, farm: { userId: user.id } },
      relations: ['farm'],
    });

    if (!sensor) {
      throw new NotFoundException('Sensor not found');
    }

    return sensor;
  }

  async updateSensor(id: string, updateSensorDto: any, user: User): Promise<Sensor> {
    const sensor = await this.getSensorById(id, user);
    
    Object.assign(sensor, updateSensorDto);
    return await this.sensorRepository.save(sensor);
  }

  async deleteSensor(id: string, user: User): Promise<void> {
    const sensor = await this.getSensorById(id, user);
    await this.sensorRepository.remove(sensor);
  }

  // Device Management
  async createDevice(createDeviceDto: any, user: User): Promise<Device> {
    const deviceData = {
      ...createDeviceDto,
    };

    return await this.deviceRepository.save(deviceData);
  }

  async getDevicesByFarm(farmId: string, user: User): Promise<Device[]> {
    return await this.deviceRepository.find({
      where: { farmId, farm: { userId: user.id } },
      relations: ['farm'],
    });
  }

  async getDeviceById(id: string, user: User): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id, farm: { userId: user.id } },
      relations: ['farm'],
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return device;
  }

  async updateDevice(id: string, updateDeviceDto: any, user: User): Promise<Device> {
    const device = await this.getDeviceById(id, user);
    
    Object.assign(device, updateDeviceDto);
    return await this.deviceRepository.save(device);
  }

  async deleteDevice(id: string, user: User): Promise<void> {
    const device = await this.getDeviceById(id, user);
    await this.deviceRepository.remove(device);
  }

  // Sensor Data Processing
  private async processSensorData(sensorData: SensorData) {
    try {
      // Find sensor by deviceId
      const sensor = await this.sensorRepository.findOne({
        where: { deviceId: sensorData.deviceId },
      });

      if (!sensor) {
        this.logger.warn(`Sensor not found for deviceId: ${sensorData.deviceId}`);
        return;
      }

      // Create sensor reading
      const reading = this.sensorReadingRepository.create({
        sensorId: sensor.id,
        value: sensorData.value,
        unit: sensorData.unit,
        metadata: sensorData.metadata,
        timestamp: sensorData.timestamp,
      });

      // Check for alerts
      if (sensor.minThreshold && sensorData.value < sensor.minThreshold) {
        reading.isAlert = true;
        reading.alertMessage = `Value ${sensorData.value} below minimum threshold ${sensor.minThreshold}`;
      } else if (sensor.maxThreshold && sensorData.value > sensor.maxThreshold) {
        reading.isAlert = true;
        reading.alertMessage = `Value ${sensorData.value} above maximum threshold ${sensor.maxThreshold}`;
      }

      await this.sensorReadingRepository.save(reading);

      // Update sensor last reading
      sensor.lastReading = sensorData.value;
      sensor.lastReadingTime = sensorData.timestamp;
      await this.sensorRepository.save(sensor);

      // Emit event for real-time updates
      this.eventEmitter.emit('sensor.reading.created', {
        sensorId: sensor.id,
        farmId: sensor.farmId,
        reading,
      });

      this.logger.log(`Processed sensor data for ${sensorData.deviceId}: ${sensorData.value}${sensorData.unit}`);

    } catch (error) {
      this.logger.error('Error processing sensor data:', error);
    }
  }

  // Device Control
  async sendDeviceCommand(deviceId: string, command: string, parameters: any, user: User): Promise<DeviceCommand> {
    const device = await this.getDeviceById(deviceId, user);

    if (!device.isControllable) {
      throw new Error('Device is not controllable');
    }

    // Create command record
    const deviceCommand = this.deviceCommandRepository.create({
      deviceId: device.id,
      command,
      parameters,
      userId: user.id,
      status: CommandStatus.PENDING,
    });

    const savedCommand = await this.deviceCommandRepository.save(deviceCommand);

    // Send MQTT command
    const mqttCommand: MqttDeviceCommand = {
      deviceId: device.deviceId,
      command,
      parameters,
      timestamp: new Date(),
    };

    const success = await this.mqttService.sendDeviceCommand(mqttCommand);
    
    if (success) {
      savedCommand.status = CommandStatus.SENT;
      await this.deviceCommandRepository.save(savedCommand);
    } else {
      savedCommand.status = CommandStatus.FAILED;
      savedCommand.errorMessage = 'Failed to send MQTT command';
      await this.deviceCommandRepository.save(savedCommand);
    }

    return savedCommand;
  }

  // Data Retrieval
  async getSensorReadings(sensorId: string, user: User, limit = 100): Promise<SensorReading[]> {
    const sensor = await this.getSensorById(sensorId, user);
    
    return await this.sensorReadingRepository.find({
      where: { sensorId: sensor.id },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getLatestSensorReadings(farmId: string, user: User): Promise<any[]> {
    const sensors = await this.getSensorsByFarm(farmId, user);
    
    const readings = await Promise.all(
      sensors.map(async (sensor) => {
        const latestReading = await this.sensorReadingRepository.findOne({
          where: { sensorId: sensor.id },
          order: { timestamp: 'DESC' },
        });

        return {
          sensor,
          latestReading,
        };
      })
    );

    return readings;
  }

  async getDeviceCommands(deviceId: string, user: User, limit = 50): Promise<DeviceCommand[]> {
    const device = await this.getDeviceById(deviceId, user);
    
    return await this.deviceCommandRepository.find({
      where: { deviceId: device.id },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  // Status Updates
  private async updateDeviceStatus(statusData: any) {
    try {
      const device = await this.deviceRepository.findOne({
        where: { deviceId: statusData.deviceId },
      });

      if (device) {
        device.status = statusData.status as DeviceStatus;
        device.currentState = statusData.state;
        await this.deviceRepository.save(device);

        // Emit event for real-time updates
        this.eventEmitter.emit('device.status.updated', {
          deviceId: device.id,
          farmId: device.farmId,
          status: device.status,
          state: device.currentState,
        });
      }
    } catch (error) {
      this.logger.error('Error updating device status:', error);
    }
  }

  private async updateCommandStatus(responseData: any) {
    try {
      const command = await this.deviceCommandRepository.findOne({
        where: { id: responseData.commandId },
      });

      if (command) {
        command.status = responseData.success ? CommandStatus.EXECUTED : CommandStatus.FAILED;
        command.response = responseData.response;
        command.executedAt = responseData.timestamp;
        
        if (!responseData.success) {
          command.errorMessage = responseData.response;
        }

        await this.deviceCommandRepository.save(command);
      }
    } catch (error) {
      this.logger.error('Error updating command status:', error);
    }
  }

  // Analytics
  async getFarmIotAnalytics(farmId: string, user: User): Promise<any> {
    const sensors = await this.getSensorsByFarm(farmId, user);
    const devices = await this.getDevicesByFarm(farmId, user);

    const sensorAnalytics = await Promise.all(
      sensors.map(async (sensor) => {
        const readings = await this.sensorReadingRepository.find({
          where: { sensorId: sensor.id },
          order: { timestamp: 'DESC' },
          take: 24, // Last 24 readings
        });

        const avgValue = readings.length > 0 
          ? readings.reduce((sum, r) => sum + r.value, 0) / readings.length 
          : 0;

        return {
          sensor,
          averageValue: avgValue,
          readingCount: readings.length,
          lastReading: readings[0],
        };
      })
    );

    return {
      sensors: {
        total: sensors.length,
        active: sensors.filter(s => s.status === SensorStatus.ACTIVE).length,
        analytics: sensorAnalytics,
      },
      devices: {
        total: devices.length,
        online: devices.filter(d => d.status === DeviceStatus.ONLINE).length,
        controllable: devices.filter(d => d.isControllable).length,
      },
    };
  }
}
