import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MqttService } from './mqtt.service';

@ApiTags('iot')
@Controller('iot')
export class IoTController {
  constructor(private readonly mqttService: MqttService) {}

  @Get('sensors/latest')
  @ApiOperation({ summary: 'Get latest sensor data' })
  @ApiResponse({ status: 200, description: 'Return latest sensor readings' })
  async getLatestData() {
    const data = await this.mqttService.getLatestSensorData();
    return {
      success: true,
      data,
    };
  }
}
