import { IsString, IsOptional, IsEnum, IsNumber, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FarmType, FarmStatus } from '../entities/farm.entity';

export class CoordinatesDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}

export class SoilInfoDto {
  @IsString()
  type: string;

  @IsNumber()
  pH: number;

  @IsObject()
  nutrients: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
}

export class ClimateInfoDto {
  @IsObject()
  temperature: {
    min: number;
    max: number;
    average: number;
  };

  @IsObject()
  humidity: {
    min: number;
    max: number;
    average: number;
  };

  @IsNumber()
  rainfall: number;
}

export class CreateFarmDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  area?: number;

  @IsOptional()
  @IsEnum(FarmType)
  type?: FarmType;

  @IsOptional()
  @IsEnum(FarmStatus)
  status?: FarmStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SoilInfoDto)
  soilInfo?: SoilInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClimateInfoDto)
  climateInfo?: ClimateInfoDto;
}
