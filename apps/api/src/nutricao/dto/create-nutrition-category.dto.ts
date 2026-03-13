import { IsString, IsOptional, MaxLength, IsInt, Min } from 'class-validator';

export class CreateNutritionCategoryDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  code?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  dailyCaloriesTarget?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
