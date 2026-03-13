import { IsString, IsOptional, MaxLength, IsInt, Min } from 'class-validator';

export class UpdateNutritionMealTypeDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  code?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}
