import { IsString, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class UpdateNutritionMenuDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  categoryId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  dayContext?: string | null;

  @IsDateString()
  @IsOptional()
  validFrom?: string | null;

  @IsDateString()
  @IsOptional()
  validTo?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
