import {
  IsBoolean,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class UpdateAutoConfigDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  moistureThreshold?: number;

  @IsNumber()
  @Min(0)
  @Max(7200)
  @IsOptional()
  irrigationDuration?: number;

  @IsNumber()
  @Min(0)
  @Max(86400)
  @IsOptional()
  cooldownPeriod?: number;
}

export class IrrigateDurationDto {
  @IsNumber()
  @Min(1)
  duration: number;
}

export class ToggleAutoModeDto {
  @IsBoolean()
  enabled: boolean;
}
