import { IsString, IsOptional, IsInt, Min, IsNumber } from 'class-validator';

export class CreateNutritionMenuItemDto {
  @IsString()
  mealTypeId: string;

  @IsString()
  description: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  calories?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  proteinG?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  carbsG?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  fatsG?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}
