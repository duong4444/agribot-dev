import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('weather')
@UseGuards(JwtAuthGuard)
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  async getWeather(@Query('address') address: string) {
    return this.weatherService.getWeatherByAddress(address);
  }

  @Get('forecast')
  async getForecast(@Query('address') address: string) {
    return this.weatherService.getForecastByAddress(address);
  }
}
