import { IsString, IsOptional, IsObject, IsDateString } from 'class-validator';

export class UpdateNutritionAnamnesisDto {
  @IsDateString()
  @IsOptional()
  assessedAt?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  notes?: string;
}
