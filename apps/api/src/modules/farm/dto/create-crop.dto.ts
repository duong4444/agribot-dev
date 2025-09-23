import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsObject } from 'class-validator';
import { CropType, CropStatus } from '../entities/crop.entity';

export class GrowingConditionsDto {
  @IsString()
  soilType: string;

  @IsNumber()
  pH: number;

  @IsObject()
  temperature: {
    min: number;
    max: number;
  };

  @IsObject()
  humidity: {
    min: number;
    max: number;
  };

  @IsString()
  wateringFrequency: string;

  @IsString()
  fertilizerSchedule: string;
}

export class CareInstructionsDto {
  @IsString()
  watering: string;

  @IsString()
  fertilizing: string;

  @IsString()
  pestControl: string;

  @IsString()
  pruning: string;

  @IsOptional()
  @IsString()
  other?: string;
}

export class CreateCropDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  variety?: string;

  @IsOptional()
  @IsEnum(CropType)
  type?: CropType;

  @IsOptional()
  @IsEnum(CropStatus)
  status?: CropStatus;

  @IsOptional()
  @IsNumber()
  plantedArea?: number;

  @IsOptional()
  @IsNumber()
  plantCount?: number;

  @IsOptional()
  @IsDateString()
  plantingDate?: string;

  @IsOptional()
  @IsDateString()
  expectedHarvestDate?: string;

  @IsOptional()
  @IsNumber()
  expectedYield?: number;

  @IsOptional()
  @IsNumber()
  marketPrice?: number;

  @IsOptional()
  @IsObject()
  growingConditions?: GrowingConditionsDto;

  @IsOptional()
  @IsObject()
  careInstructions?: CareInstructionsDto;

  @IsString()
  farmId: string;
}
