import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { IrrigationService } from '../services/irrigation.service';
import {
  UpdateAutoConfigDto,
  IrrigateDurationDto,
  ToggleAutoModeDto,
} from '../dto/irrigation.dto';

@Controller('iot/devices/:deviceId/irrigation')
@UseGuards(JwtAuthGuard)
export class IrrigationController {
  constructor(private readonly irrigationService: IrrigationService) {}

  // ============================================================================
  // Manual Control
  // ============================================================================

  @Post('on')
  async turnOn(@Param('deviceId') deviceId: string, @Request() req) {
    return this.irrigationService.turnOnPump(deviceId, req.user.id);
  }

  @Post('off')
  async turnOff(@Param('deviceId') deviceId: string, @Request() req) {
    return this.irrigationService.turnOffPump(deviceId, req.user.id);
  }

  // ============================================================================
  // Duration-based Irrigation
  // ============================================================================

  @Post('duration')
  async irrigateDuration(
    @Param('deviceId') deviceId: string,
    @Body() dto: IrrigateDurationDto,
    @Request() req,
  ) {
    return this.irrigationService.irrigateDuration(deviceId, dto, req.user.id);
  }

  // ============================================================================
  // Auto Mode Configuration
  // ============================================================================

  @Get('auto-config')
  async getAutoConfig(@Param('deviceId') deviceId: string) {
    return this.irrigationService.getAutoConfig(deviceId);
  }

  @Put('auto-config')
  async updateAutoConfig(
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdateAutoConfigDto,
    @Request() req,
  ) {
    return this.irrigationService.updateAutoConfig(deviceId, dto, req.user.id);
  }

  @Post('auto-mode')
  async toggleAutoMode(
    @Param('deviceId') deviceId: string,
    @Body() dto: ToggleAutoModeDto,
    @Request() req,
  ) {
    return this.irrigationService.toggleAutoMode(
      deviceId,
      dto.enabled,
      req.user.id,
    );
  }

  // ============================================================================
  // History & Stats
  // ============================================================================

  @Get('history')
  async getHistory(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: number,
  ) {
    return this.irrigationService.getIrrigationHistory(
      deviceId,
      limit ? parseInt(limit.toString()) : 20,
    );
  }

  @Get('stats')
  async getStats(
    @Param('deviceId') deviceId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.irrigationService.getIrrigationStats(
      deviceId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
