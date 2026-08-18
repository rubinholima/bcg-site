import { IsString, IsOptional, IsObject, IsDateString } from 'class-validator';

export class CreateNutritionAnamnesisDto {
  @IsString()
  playerId: string;

  @IsDateString()
  assessedAt: string;

  @IsObject()
  data: Record<string, unknown>;

  @IsString()
  @IsOptional()
  notes?: string;
}
