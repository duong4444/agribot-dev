import { Controller, Post, Body, Param, UseGuards, Request, Get, Put } from '@nestjs/common';
import { LightingService } from '../services/lighting.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('iot/devices/:id/lighting')
@UseGuards(JwtAuthGuard)
export class LightingController {
  constructor(private readonly lightingService: LightingService) {}

  @Post('on')
  async turnOn(@Param('id') id: string, @Request() req) {
    return this.lightingService.turnOn(id, req.user.id);
  }

  @Post('off')
  async turnOff(@Param('id') id: string, @Request() req) {
    return this.lightingService.turnOff(id, req.user.id);
  }

  @Get('auto-config')
  async getAutoConfig(@Param('id') id: string) {
    return this.lightingService.getAutoConfig(id);
  }

  @Put('auto-config')
  async updateAutoConfig(
    @Param('id') id: string,
    @Body() body: { enabled?: boolean; threshold?: number },
    @Request() req,
  ) {
    return this.lightingService.updateAutoConfig(id, req.user.id, body);
  }
}
