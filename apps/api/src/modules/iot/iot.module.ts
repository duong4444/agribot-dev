import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { IotController } from './iot.controller';
import { IotService } from './iot.service';
import { MqttService } from './mqtt.service';
import { IotGateway } from './iot.gateway';
import { Sensor } from './entities/sensor.entity';
import { Device } from './entities/device.entity';
import { SensorReading } from './entities/sensor-reading.entity';
import { DeviceCommand } from './entities/device-command.entity';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    TypeOrmModule.forFeature([
      Sensor,
      Device,
      SensorReading,
      DeviceCommand,
    ]),
  ],
  controllers: [IotController],
  providers: [IotService, MqttService, IotGateway],
  exports: [IotService, MqttService, IotGateway],
})
export class IotModule {}
