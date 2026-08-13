import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class ScoutLocationPingDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  altitude?: number;

  @IsOptional()
  @IsNumber()
  heading?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  reportId?: string;

  @IsOptional()
  @IsBoolean()
  reverseGeocode?: boolean;
}

export class ScoutTrackingDto {
  @IsBoolean()
  active!: boolean;
}
