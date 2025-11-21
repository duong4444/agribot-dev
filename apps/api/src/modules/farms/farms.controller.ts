import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FarmsService } from './farms.service';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { CreateAreaDto } from './dto/create-area.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Farms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('farms')
export class FarmsController {
  constructor(private readonly farmsService: FarmsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new farm for the current user' })
  create(@CurrentUser() user: User, @Body() createFarmDto: CreateFarmDto) {
    return this.farmsService.createFarm(user, createFarmDto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user farm' })
  getMyFarm(@CurrentUser() user: User) {
    return this.farmsService.getFarmByUser(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user farm' })
  update(@CurrentUser() user: User, @Body() updateFarmDto: UpdateFarmDto) {
    return this.farmsService.updateFarm(user, updateFarmDto);
  }

  @Post('areas')
  @ApiOperation({ summary: 'Add an area to the farm' })
  createArea(@CurrentUser() user: User, @Body() createAreaDto: CreateAreaDto) {
    return this.farmsService.createArea(user, createAreaDto);
  }

  @Get('areas')
  @ApiOperation({ summary: 'Get all areas of the farm' })
  getAreas(@CurrentUser() user: User) {
    return this.farmsService.getAreas(user);
  }

  @Post('activities')
  @ApiOperation({ summary: 'Record a farm activity' })
  createActivity(@CurrentUser() user: User, @Body() createActivityDto: CreateActivityDto) {
    return this.farmsService.createActivity(user, createActivityDto);
  }

  @Get('activities')
  @ApiOperation({ summary: 'Get farm activities' })
  getActivities(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.farmsService.getActivities(user, limit, offset);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get financial stats' })
  getStats(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.farmsService.getFinancialStats(user, startDate, endDate);
  }
}
