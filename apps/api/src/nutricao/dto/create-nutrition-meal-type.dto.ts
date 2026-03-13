import { IsString, IsOptional, MaxLength, IsInt, Min } from 'class-validator';

export class CreateNutritionMealTypeDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(64)
  code: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}
