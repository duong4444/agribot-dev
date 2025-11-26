import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { InstallationRequestService } from '../services/installation-request.service';
import { CreateInstallationRequestDto, AssignTechnicianDto } from '../dto/installation-request.dto';
import { InstallationRequestStatus } from '../entities/installation-request.entity';

@Controller('installation-requests')
@UseGuards(JwtAuthGuard)
export class InstallationRequestController {
  constructor(
    private readonly installationRequestService: InstallationRequestService,
  ) {}

  // Farmer endpoints
  @Post()
  async create(@Request() req, @Body() dto: CreateInstallationRequestDto) {
    const farmerId = req.user.id;
    return this.installationRequestService.create(farmerId, dto);
  }

  @Get()
  async findMyRequests(@Request() req) {
    const farmerId = req.user.id;
    return this.installationRequestService.findAllByFarmer(farmerId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const farmerId = req.user.id;
    return this.installationRequestService.findOne(id, farmerId);
  }

  @Delete(':id')
  async cancel(@Request() req, @Param('id') id: string) {
    const farmerId = req.user.id;
    return this.installationRequestService.cancel(id, farmerId);
  }
}

@Controller('admin/installation-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminInstallationRequestController {
  constructor(
    private readonly installationRequestService: InstallationRequestService,
  ) {}

  @Get()
  async findAll() {
    return this.installationRequestService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.installationRequestService.findOne(id);
  }

  @Put(':id/assign')
  async assignTechnician(@Param('id') id: string, @Body() dto: AssignTechnicianDto) {
    return this.installationRequestService.assignTechnician(id, dto);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: InstallationRequestStatus }) {
    return this.installationRequestService.updateStatus(id, body.status);
  }
}

@Controller('technician/installation-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TECHNICIAN)
export class TechnicianInstallationRequestController {
  constructor(
    private readonly installationRequestService: InstallationRequestService,
  ) {}

  @Get()
  async findMyAssignments(@Request() req) {
    const technicianId = req.user.id;
    return this.installationRequestService.findByTechnician(technicianId);
  }

  @Put(':id/start')
  async startInstallation(@Param('id') id: string) {
    return this.installationRequestService.updateStatus(id, InstallationRequestStatus.IN_PROGRESS);
  }

  @Put(':id/complete')
  async completeInstallation(@Param('id') id: string) {
    return this.installationRequestService.updateStatus(id, InstallationRequestStatus.COMPLETED);
  }
}
