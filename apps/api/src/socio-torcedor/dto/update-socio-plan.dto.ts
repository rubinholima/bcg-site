import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSocioPlanDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priceMonthly?: number;

  @IsOptional()
  @IsObject()
  perks?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
