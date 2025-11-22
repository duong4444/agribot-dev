import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from '../entities/farm-activity.entity';

export class CreateActivityDto {
  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  type: ActivityType;

  @ApiProperty()
  @IsDateString()
  date: Date;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @IsOptional()
  cost?: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @IsOptional()
  revenue?: number;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  areaId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cropName?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  cropId?: string;
}
