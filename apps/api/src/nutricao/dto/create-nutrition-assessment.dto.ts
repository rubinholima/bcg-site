import { IsString, IsOptional, IsNumber, Min, IsDateString } from 'class-validator';

export class CreateNutritionAssessmentDto {
  @IsString()
  playerId: string;

  @IsDateString()
  assessedAt: string;

  @IsNumber()
  @Min(0)
  weightKg: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  heightCm?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  bmi?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  bodyFatPercent?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
