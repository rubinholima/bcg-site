import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSocioPlanDto {
  @IsString()
  tenantId: string;

  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priceMonthly: number;

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
