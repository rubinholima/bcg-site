import { IsString, IsDateString, IsOptional, MaxLength } from 'class-validator';

export class CreateNutritionCalendarEntryDto {
  @IsString()
  tenantId: string;

  @IsString()
  categoryId: string;

  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsString()
  menuId: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  dayContext?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
