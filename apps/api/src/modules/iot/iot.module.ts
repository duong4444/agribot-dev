import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttService } from './mqtt.service';
import { IoTController } from './iot.controller';
import { DeviceService } from './device.service';
import { InstallationRequestService } from './services/installation-request.service';
import { SensorData } from './entities/sensor-data.entity';
import { Device } from './entities/device.entity';
import { InstallationRequest } from './entities/installation-request.entity';
import { 
  InstallationRequestController,
  AdminInstallationRequestController,
  TechnicianInstallationRequestController 
} from './controllers/installation-request.controller';
import { 
  DeviceInventoryController,
  TechnicianDeviceController 
} from './controllers/device-inventory.controller';
import { Area } from '../farms/entities/area.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SensorData,
      Device,
      InstallationRequest,
      Area,
      User,
    ]),
  ],
  controllers: [
    IoTController,
    InstallationRequestController,
    AdminInstallationRequestController,
    TechnicianInstallationRequestController,
    DeviceInventoryController,
    TechnicianDeviceController,
  ],
  providers: [
    MqttService,
    DeviceService,
    InstallationRequestService,
  ],
  exports: [
    MqttService,
    DeviceService,
    InstallationRequestService,
  ],
})
export class IoTModule {}
