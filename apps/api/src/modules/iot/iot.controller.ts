import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IotService } from './iot.service';
import { MqttService } from './mqtt.service';

@Controller('iot')
@UseGuards(JwtAuthGuard)
export class IotController {
  constructor(
    private iotService: IotService,
    private mqttService: MqttService,
  ) {}

  // Sensor endpoints
  @Post('sensors')
  async createSensor(@Body() createSensorDto: any, @Request() req) {
    return await this.iotService.createSensor(createSensorDto, req.user);
  }

  @Get('farms/:farmId/sensors')
  async getSensorsByFarm(@Param('farmId') farmId: string, @Request() req) {
    return await this.iotService.getSensorsByFarm(farmId, req.user);
  }

  @Get('sensors/:id')
  async getSensorById(@Param('id') id: string, @Request() req) {
    return await this.iotService.getSensorById(id, req.user);
  }

  @Put('sensors/:id')
  async updateSensor(@Param('id') id: string, @Body() updateSensorDto: any, @Request() req) {
    return await this.iotService.updateSensor(id, updateSensorDto, req.user);
  }

  @Delete('sensors/:id')
  async deleteSensor(@Param('id') id: string, @Request() req) {
    await this.iotService.deleteSensor(id, req.user);
    return { message: 'Sensor deleted successfully' };
  }

  @Get('sensors/:id/readings')
  async getSensorReadings(
    @Param('id') id: string,
    @Query('limit') limit: string,
    @Request() req
  ) {
    const limitNum = limit ? parseInt(limit) : 100;
    return await this.iotService.getSensorReadings(id, req.user, limitNum);
  }

  // Device endpoints
  @Post('devices')
  async createDevice(@Body() createDeviceDto: any, @Request() req) {
    return await this.iotService.createDevice(createDeviceDto, req.user);
  }

  @Get('farms/:farmId/devices')
  async getDevicesByFarm(@Param('farmId') farmId: string, @Request() req) {
    return await this.iotService.getDevicesByFarm(farmId, req.user);
  }

  @Get('devices/:id')
  async getDeviceById(@Param('id') id: string, @Request() req) {
    return await this.iotService.getDeviceById(id, req.user);
  }

  @Put('devices/:id')
  async updateDevice(@Param('id') id: string, @Body() updateDeviceDto: any, @Request() req) {
    return await this.iotService.updateDevice(id, updateDeviceDto, req.user);
  }

  @Delete('devices/:id')
  async deleteDevice(@Param('id') id: string, @Request() req) {
    await this.iotService.deleteDevice(id, req.user);
    return { message: 'Device deleted successfully' };
  }

  @Post('devices/:id/command')
  async sendDeviceCommand(
    @Param('id') id: string,
    @Body() commandDto: { command: string; parameters?: any },
    @Request() req
  ) {
    return await this.iotService.sendDeviceCommand(
      id,
      commandDto.command,
      commandDto.parameters,
      req.user
    );
  }

  @Get('devices/:id/commands')
  async getDeviceCommands(
    @Param('id') id: string,
    @Query('limit') limit: string,
    @Request() req
  ) {
    const limitNum = limit ? parseInt(limit) : 50;
    return await this.iotService.getDeviceCommands(id, req.user, limitNum);
  }

  // Analytics endpoints
  @Get('farms/:farmId/analytics')
  async getFarmIotAnalytics(@Param('farmId') farmId: string, @Request() req) {
    return await this.iotService.getFarmIotAnalytics(farmId, req.user);
  }

  @Get('farms/:farmId/sensors/latest')
  async getLatestSensorReadings(@Param('farmId') farmId: string, @Request() req) {
    return await this.iotService.getLatestSensorReadings(farmId, req.user);
  }

  // MQTT status
  @Get('mqtt/status')
  async getMqttStatus() {
    return {
      connected: this.mqttService.isMqttConnected(),
      timestamp: new Date(),
    };
  }

  // Request sensor data
  @Post('sensors/:deviceId/request')
  async requestSensorData(@Param('deviceId') deviceId: string) {
    const success = await this.mqttService.requestSensorData(deviceId);
    return {
      success,
      message: success ? 'Sensor data requested' : 'Failed to request sensor data',
    };
  }
}
