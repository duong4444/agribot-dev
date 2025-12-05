import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInstallationRequestDto {
  @IsUUID()
  areaId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}

export class UpdateInstallationRequestDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}

export class AssignTechnicianDto {
  @IsUUID()
  technicianId: string;
}

export class ActivateDeviceDto {
  @IsString()
  serialNumber: string;

  @IsUUID()
  areaId: string;

  @IsUUID()
  installationRequestId: string;

  @IsOptional()
  isPaid?: boolean;
}
