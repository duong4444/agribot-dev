import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttService } from './mqtt.service';
import { IoTController } from './iot.controller';
import { DeviceService } from './device.service';
import { InstallationRequestService } from './services/installation-request.service';
import { IrrigationService } from './services/irrigation.service';
import { SensorData } from './entities/sensor-data.entity';
import { Device } from './entities/device.entity';
import { InstallationRequest } from './entities/installation-request.entity';
import { DeviceAutoConfig } from './entities/device-auto-config.entity';
import { IrrigationEvent } from './entities/irrigation-event.entity';
import { 
  InstallationRequestController,
  AdminInstallationRequestController,
  TechnicianInstallationRequestController 
} from './controllers/installation-request.controller';
import { 
  DeviceInventoryController,
  TechnicianDeviceController 
} from './controllers/device-inventory.controller';
import { IrrigationController } from './controllers/irrigation.controller';
import { Area } from '../farms/entities/area.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SensorData,
      Device,
      InstallationRequest,
      DeviceAutoConfig,
      IrrigationEvent,
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
    IrrigationController,
  ],
  providers: [
    MqttService,
    DeviceService,
    InstallationRequestService,
    IrrigationService,
  ],
  exports: [
    MqttService,
    DeviceService,
    InstallationRequestService,
    IrrigationService,
  ],
})
export class IoTModule {}
