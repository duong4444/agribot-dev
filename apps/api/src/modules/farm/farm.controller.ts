import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FarmService } from './farm.service';
import { CreateFarmDto, CreateCropDto, CreateActivityDto } from './dto';
import { Farm, Crop, Activity } from './entities';

@ApiTags('Farm Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('farms')
export class FarmController {
  constructor(private readonly farmService: FarmService) {}

  // ==================== FARM ENDPOINTS ====================

  @Post()
  @ApiOperation({ summary: 'Create a new farm' })
  @ApiResponse({
    status: 201,
    description: 'Farm created successfully',
    type: Farm,
  })
  async createFarm(@Request() req, @Body() createFarmDto: CreateFarmDto): Promise<Farm> {
    return await this.farmService.createFarm(req.user, createFarmDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all farms for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Farms retrieved successfully',
    type: [Farm],
  })
  async getFarms(@Request() req): Promise<Farm[]> {
    return await this.farmService.getFarmsByUser(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get farm by ID' })
  @ApiResponse({
    status: 200,
    description: 'Farm retrieved successfully',
    type: Farm,
  })
  async getFarm(@Request() req, @Param('id') id: string): Promise<Farm> {
    return await this.farmService.getFarmById(id, req.user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update farm' })
  @ApiResponse({
    status: 200,
    description: 'Farm updated successfully',
    type: Farm,
  })
  async updateFarm(
    @Request() req,
    @Param('id') id: string,
    @Body() updateData: Partial<Farm>,
  ): Promise<Farm> {
    return await this.farmService.updateFarm(id, req.user, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete farm' })
  @ApiResponse({
    status: 200,
    description: 'Farm deleted successfully',
  })
  async deleteFarm(@Request() req, @Param('id') id: string): Promise<{ message: string }> {
    await this.farmService.deleteFarm(id, req.user);
    return { message: 'Farm deleted successfully' };
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get farm analytics and statistics' })
  @ApiResponse({
    status: 200,
    description: 'Farm analytics retrieved successfully',
  })
  async getFarmAnalytics(@Request() req, @Param('id') id: string) {
    return await this.farmService.getFarmAnalytics(id, req.user);
  }

  // ==================== CROP ENDPOINTS ====================

  @Post('crops')
  @ApiOperation({ summary: 'Create a new crop' })
  @ApiResponse({
    status: 201,
    description: 'Crop created successfully',
    type: Crop,
  })
  async createCrop(@Request() req, @Body() createCropDto: CreateCropDto): Promise<Crop> {
    return await this.farmService.createCrop(createCropDto, req.user);
  }

  @Get('crops/farm/:farmId')
  @ApiOperation({ summary: 'Get all crops for a specific farm' })
  @ApiResponse({
    status: 200,
    description: 'Crops retrieved successfully',
    type: [Crop],
  })
  async getCropsByFarm(@Request() req, @Param('farmId') farmId: string): Promise<Crop[]> {
    return await this.farmService.getCropsByFarm(farmId, req.user);
  }

  @Get('crops/:id')
  @ApiOperation({ summary: 'Get crop by ID' })
  @ApiResponse({
    status: 200,
    description: 'Crop retrieved successfully',
    type: Crop,
  })
  async getCrop(@Request() req, @Param('id') id: string): Promise<Crop> {
    return await this.farmService.getCropById(id, req.user);
  }

  @Put('crops/:id')
  @ApiOperation({ summary: 'Update crop' })
  @ApiResponse({
    status: 200,
    description: 'Crop updated successfully',
    type: Crop,
  })
  async updateCrop(
    @Request() req,
    @Param('id') id: string,
    @Body() updateData: Partial<Crop>,
  ): Promise<Crop> {
    return await this.farmService.updateCrop(id, req.user, updateData);
  }

  @Delete('crops/:id')
  @ApiOperation({ summary: 'Delete crop' })
  @ApiResponse({
    status: 200,
    description: 'Crop deleted successfully',
  })
  async deleteCrop(@Request() req, @Param('id') id: string): Promise<{ message: string }> {
    await this.farmService.deleteCrop(id, req.user);
    return { message: 'Crop deleted successfully' };
  }

  // ==================== ACTIVITY ENDPOINTS ====================

  @Post('activities')
  @ApiOperation({ summary: 'Create a new activity' })
  @ApiResponse({
    status: 201,
    description: 'Activity created successfully',
    type: Activity,
  })
  async createActivity(@Request() req, @Body() createActivityDto: CreateActivityDto): Promise<Activity> {
    return await this.farmService.createActivity(createActivityDto, req.user);
  }

  @Get('activities/farm/:farmId')
  @ApiOperation({ summary: 'Get all activities for a specific farm' })
  @ApiResponse({
    status: 200,
    description: 'Activities retrieved successfully',
    type: [Activity],
  })
  async getActivitiesByFarm(@Request() req, @Param('farmId') farmId: string): Promise<Activity[]> {
    return await this.farmService.getActivitiesByFarm(farmId, req.user);
  }

  @Get('activities/crop/:cropId')
  @ApiOperation({ summary: 'Get all activities for a specific crop' })
  @ApiResponse({
    status: 200,
    description: 'Activities retrieved successfully',
    type: [Activity],
  })
  async getActivitiesByCrop(@Request() req, @Param('cropId') cropId: string): Promise<Activity[]> {
    return await this.farmService.getActivitiesByCrop(cropId, req.user);
  }

  @Get('activities/:id')
  @ApiOperation({ summary: 'Get activity by ID' })
  @ApiResponse({
    status: 200,
    description: 'Activity retrieved successfully',
    type: Activity,
  })
  async getActivity(@Request() req, @Param('id') id: string): Promise<Activity> {
    return await this.farmService.getActivityById(id, req.user);
  }

  @Put('activities/:id')
  @ApiOperation({ summary: 'Update activity' })
  @ApiResponse({
    status: 200,
    description: 'Activity updated successfully',
    type: Activity,
  })
  async updateActivity(
    @Request() req,
    @Param('id') id: string,
    @Body() updateData: Partial<Activity>,
  ): Promise<Activity> {
    return await this.farmService.updateActivity(id, req.user, updateData);
  }

  @Delete('activities/:id')
  @ApiOperation({ summary: 'Delete activity' })
  @ApiResponse({
    status: 200,
    description: 'Activity deleted successfully',
  })
  async deleteActivity(@Request() req, @Param('id') id: string): Promise<{ message: string }> {
    await this.farmService.deleteActivity(id, req.user);
    return { message: 'Activity deleted successfully' };
  }

  // ==================== EXPENSE ENDPOINTS ====================

  @Post('expenses')
  @ApiOperation({ summary: 'Create a new expense' })
  @ApiResponse({
    status: 201,
    description: 'Expense created successfully',
  })
  async createExpense(@Request() req, @Body() createExpenseDto: any) {
    return await this.farmService.createExpense(createExpenseDto, req.user);
  }

  @Get('expenses/farm/:farmId')
  @ApiOperation({ summary: 'Get all expenses for a specific farm' })
  @ApiResponse({
    status: 200,
    description: 'Expenses retrieved successfully',
  })
  async getExpensesByFarm(@Request() req, @Param('farmId') farmId: string) {
    return await this.farmService.getExpensesByFarm(farmId, req.user);
  }

  @Get('expenses/:id')
  @ApiOperation({ summary: 'Get expense by ID' })
  @ApiResponse({
    status: 200,
    description: 'Expense retrieved successfully',
  })
  async getExpense(@Request() req, @Param('id') id: string) {
    return await this.farmService.getExpenseById(id, req.user);
  }

  @Put('expenses/:id')
  @ApiOperation({ summary: 'Update expense' })
  @ApiResponse({
    status: 200,
    description: 'Expense updated successfully',
  })
  async updateExpense(
    @Request() req,
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    return await this.farmService.updateExpense(id, req.user, updateData);
  }

  @Delete('expenses/:id')
  @ApiOperation({ summary: 'Delete expense' })
  @ApiResponse({
    status: 200,
    description: 'Expense deleted successfully',
  })
  async deleteExpense(@Request() req, @Param('id') id: string) {
    await this.farmService.deleteExpense(id, req.user);
    return { message: 'Expense deleted successfully' };
  }

  // ==================== DASHBOARD ENDPOINTS ====================

  @Get('dashboard/upcoming-activities')
  @ApiOperation({ summary: 'Get upcoming activities for dashboard' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look ahead (default: 7)' })
  @ApiResponse({
    status: 200,
    description: 'Upcoming activities retrieved successfully',
    type: [Activity],
  })
  async getUpcomingActivities(
    @Request() req,
    @Query('days') days?: number,
  ): Promise<Activity[]> {
    return await this.farmService.getUpcomingActivities(req.user, days || 7);
  }
}
