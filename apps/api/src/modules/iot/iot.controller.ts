import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PremiumSubscriptionGuard } from '../auth/guards/premium-subscription.guard';
import { MqttService } from './mqtt.service';
import { DeviceService } from './device.service';
import { CreateDeviceDto, UpdateDeviceDto } from './dto/device.dto';

@ApiTags('IoT')
@Controller('iot')
@UseGuards(JwtAuthGuard, PremiumSubscriptionGuard)
@ApiBearerAuth()
export class IoTController {
  constructor(
    private readonly mqttService: MqttService,
    private readonly deviceService: DeviceService,
  ) {}

  @Get('sensors/latest')
  @ApiOperation({ summary: 'Get latest sensor data' })
  @ApiResponse({ status: 200, description: 'Return latest sensor readings' })
  async getLatestData(@Request() req, @Query('areaId') areaId?: string) {
    const userId = req.user.id as string;
    const data = await this.mqttService.getLatestSensorData(userId, areaId);
    return {
      success: true,
      data,
    };
  }

  @Get('devices')
  @ApiOperation({ summary: 'List all devices' })
  async getDevices(@Query('farmId') farmId?: string) {
    return this.deviceService.findAll(farmId);
  }

  @Post('devices')
  @ApiOperation({ summary: 'Register a new device' })
  async createDevice(@Body() createDeviceDto: CreateDeviceDto) {
    return this.deviceService.create(createDeviceDto);
  }

  @Put('devices/:id/assign')
  @ApiOperation({ summary: 'Assign device to an area' })
  async assignDevice(@Param('id') id: string, @Body('areaId') areaId: string) {
    return this.deviceService.assignToArea(id, areaId);
  }
}
