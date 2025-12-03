import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DateUtils } from '../../../common/utils/date.util';
import { InstallationRequest, InstallationRequestStatus } from '../entities/installation-request.entity';
import { CreateInstallationRequestDto, AssignTechnicianDto } from '../dto/installation-request.dto';
import { User, UserRole } from '../../users/entities/user.entity';
import { Area } from '../../farms/entities/area.entity';

@Injectable()
export class InstallationRequestService {
  constructor(
    @InjectRepository(InstallationRequest)
    private installationRequestRepository: Repository<InstallationRequest>,
    @InjectRepository(Area)
    private areaRepository: Repository<Area>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(farmerId: string, dto: CreateInstallationRequestDto): Promise<InstallationRequest> {
    // Verify area belongs to farmer's farm
    const area = await this.areaRepository.findOne({
      where: { id: dto.areaId },
      relations: ['farm'],
    });

    if (!area) {
      throw new NotFoundException('Area not found');
    }

    if (area.farm.userId !== farmerId) {
      throw new ForbiddenException('You do not have access to this area');
    }

    const request = this.installationRequestRepository.create({
      farmerId,
      farmId: area.farmId,
      areaId: dto.areaId,
      notes: dto.notes,
      contactPhone: dto.contactPhone,
      status: InstallationRequestStatus.PENDING,
      createdAt: DateUtils.getVietnamTime(),
    });

    return this.installationRequestRepository.save(request);
  }

  async findAllByFarmer(farmerId: string): Promise<InstallationRequest[]> {
    return this.installationRequestRepository.find({
      where: { farmerId },
      relations: ['area', 'farm', 'assignedTechnician'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, farmerId?: string): Promise<InstallationRequest> {
    const request = await this.installationRequestRepository.findOne({
      where: { id },
      relations: ['area', 'farm', 'farmer', 'assignedTechnician'],
    });

    if (!request) {
      throw new NotFoundException('Installation request not found');
    }

    // If farmerId is provided, verify ownership
    if (farmerId && request.farmerId !== farmerId) {
      throw new ForbiddenException('You do not have access to this request');
    }

    return request;
  }

  async findAll(): Promise<InstallationRequest[]> {
    return this.installationRequestRepository.find({
      relations: ['area', 'farm', 'farmer', 'assignedTechnician'],
      order: { createdAt: 'DESC' },
    });
  }

  async assignTechnician(requestId: string, dto: AssignTechnicianDto): Promise<InstallationRequest> {
    const request = await this.findOne(requestId);

    // Verify technician exists and has correct role
    const technician = await this.userRepository.findOne({
      where: { id: dto.technicianId },
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    if (technician.role !== UserRole.TECHNICIAN) {
      throw new BadRequestException('User is not a technician');
    }

    request.assignedTechnicianId = dto.technicianId;
    request.status = InstallationRequestStatus.ASSIGNED;

    return this.installationRequestRepository.save(request);
  }

  async updateStatus(requestId: string, status: InstallationRequestStatus): Promise<InstallationRequest> {
    const request = await this.findOne(requestId);
    request.status = status;
    return this.installationRequestRepository.save(request);
  }

  async cancel(requestId: string, farmerId: string): Promise<InstallationRequest> {
    const request = await this.findOne(requestId, farmerId);

    if (request.status !== InstallationRequestStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending requests');
    }

    request.status = InstallationRequestStatus.CANCELLED;
    return this.installationRequestRepository.save(request);
  }

  async findByTechnician(technicianId: string): Promise<InstallationRequest[]> {
    return this.installationRequestRepository.find({
      where: { assignedTechnicianId: technicianId },
      relations: ['area', 'farm', 'farmer'],
      order: { createdAt: 'DESC' },
    });
  }

  async cancelByAdmin(requestId: string): Promise<InstallationRequest> {
    const request = await this.findOne(requestId);

    if (request.status === InstallationRequestStatus.CANCELLED) {
      throw new BadRequestException('Request is already cancelled');
    }

    if (request.status === InstallationRequestStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed request');
    }

    request.status = InstallationRequestStatus.CANCELLED;
    return this.installationRequestRepository.save(request);
  }

  async delete(requestId: string): Promise<void> {
    const request = await this.findOne(requestId);
    await this.installationRequestRepository.remove(request);
  }
}
