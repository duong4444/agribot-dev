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
import { CreateAreaDto, UpdateAreaDto } from './dto/create-area.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
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
  getAreas(
    @CurrentUser() user: User,
    @Query('excludeWithDevices') excludeWithDevices?: string,
  ) {
    return this.farmsService.getAreas(user, excludeWithDevices === 'true');
  }

  @Get('areas/:id')
  @ApiOperation({ summary: 'Get an area by ID' })
  getArea(@CurrentUser() user: User, @Param('id') id: string) {
    return this.farmsService.getArea(user, id);
  }

  @Patch('areas/:id')
  @ApiOperation({ summary: 'Update an area' })
  updateArea(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateAreaDto: UpdateAreaDto,
  ) {
    return this.farmsService.updateArea(user, id, updateAreaDto);
  }

  @Delete('areas/:id')
  @ApiOperation({ summary: 'Delete an area' })
  deleteArea(@CurrentUser() user: User, @Param('id') id: string) {
    return this.farmsService.deleteArea(user, id);
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('areaId') areaId?: string,
    @Query('cropName') cropName?: string,
    @Query('search') search?: string,
  ) {
    return this.farmsService.getActivities(
      user,
      limit,
      offset,
      startDate,
      endDate,
      type,
      areaId,
      cropName,
      search,
    );
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

  @Get('finance/breakdown')
  @ApiOperation({ summary: 'Get detailed financial breakdown' })
  getFinancialBreakdown(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.farmsService.getFinancialBreakdown(user, startDate, endDate);
  }

  @Patch('activities/:id')
  @ApiOperation({ summary: 'Update a farm activity' })
  updateActivity(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateActivityDto: UpdateActivityDto,
  ) {
    return this.farmsService.updateActivity(user, id, updateActivityDto);
  }

  @Delete('activities/:id')
  @ApiOperation({ summary: 'Delete a farm activity' })
  deleteActivity(@CurrentUser() user: User, @Param('id') id: string) {
    return this.farmsService.deleteActivity(user, id);
  }

  @Get('crops')
  @ApiOperation({ summary: 'Get all crops' })
  getCrops() {
    return this.farmsService.getCrops();
  }

  @Post('crops/seed')
  @ApiOperation({ summary: 'Seed crops data (temporary endpoint)' })
  seedCrops() {
    return this.farmsService.seedCropsManually();
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all farms (Admin only)' })
  getAllFarms() {
    return this.farmsService.getAllFarms();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get farm by ID (Admin only)' })
  getFarmById(@Param('id') id: string) {
    return this.farmsService.getFarmById(id);
  }
}
