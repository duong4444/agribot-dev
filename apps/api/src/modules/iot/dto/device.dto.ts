import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { DeviceType } from '../entities/device.entity';

export class CreateDeviceDto {
  @IsString()
  serialNumber: string;

  @IsString()
  name: string;

  @IsEnum(DeviceType)
  @IsOptional()
  type?: DeviceType;

  @IsString()
  @IsOptional()
  areaId?: string;
}

export class UpdateDeviceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  areaId?: string;
}
