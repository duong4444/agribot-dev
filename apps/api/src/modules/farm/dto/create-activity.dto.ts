import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsObject, IsArray } from 'class-validator';
import { ActivityType, ActivityStatus } from '../entities/activity.entity';

export class MaterialDto {
  @IsString()
  name: string;

  @IsNumber()
  quantity: number;

  @IsString()
  unit: string;

  @IsNumber()
  cost: number;
}

export class WeatherDto {
  @IsNumber()
  temperature: number;

  @IsNumber()
  humidity: number;

  @IsString()
  condition: string;
}

export class NotesDto {
  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  issues?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;
}

export class LocationDto {
  @IsString()
  area: string;

  @IsOptional()
  @IsObject()
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export class CreateActivityDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ActivityType)
  type: ActivityType;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsDateString()
  scheduledDate: string;

  @IsOptional()
  @IsDateString()
  actualDate?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsArray()
  materials?: MaterialDto[];

  @IsOptional()
  @IsObject()
  weather?: WeatherDto;

  @IsOptional()
  @IsObject()
  notes?: NotesDto;

  @IsOptional()
  @IsObject()
  location?: LocationDto;

  @IsString()
  farmId: string;

  @IsOptional()
  @IsString()
  cropId?: string;
}
