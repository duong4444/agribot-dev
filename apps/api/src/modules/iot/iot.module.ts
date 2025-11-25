import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttService } from './mqtt.service';
import { IoTController } from './iot.controller';
import { DeviceService } from './device.service';
import { SensorData } from './entities/sensor-data.entity';
import { Device } from './entities/device.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SensorData, Device])],
  controllers: [IoTController],
  providers: [MqttService, DeviceService],
  exports: [MqttService, DeviceService],
})
export class IoTModule {}
