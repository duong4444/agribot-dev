import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { DeviceService } from '../device.service';
import { ActivateDeviceDto } from '../dto/installation-request.dto';
import { DeviceStatus } from '../entities/device.entity';

@Controller('admin/device-inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class DeviceInventoryController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  async findAll() {
    return this.deviceService.findAll();
  }

  @Get('available')
  async findAvailable() {
    return this.deviceService.findByStatus(DeviceStatus.AVAILABLE);
  }

  @Post()
  async create(@Body() body: { serialNumber: string; type: string; name: string }) {
    return this.deviceService.createInventoryDevice(body.serialNumber, body.type, body.name);
  }
}

@Controller('technician/devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TECHNICIAN)
export class TechnicianDeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post('activate')
  async activateDevice(@Request() req, @Body() dto: ActivateDeviceDto) {
    const technicianId = req.user.id;
    return this.deviceService.activateDevice(dto, technicianId);
  }

  @Get('serial/:serialNumber')
  async findBySerialNumber(@Param('serialNumber') serialNumber: string) {
    return this.deviceService.findBySerialNumber(serialNumber);
  }
}
