import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttService } from './mqtt.service';
import { IoTController } from './iot.controller';
import { SensorData } from './entities/sensor-data.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SensorData])],
  controllers: [IoTController],
  providers: [MqttService],
  exports: [MqttService],
})
export class IoTModule {}
