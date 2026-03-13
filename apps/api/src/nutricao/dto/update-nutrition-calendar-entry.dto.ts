import { IsString, IsDateString, IsOptional, MaxLength } from 'class-validator';

export class UpdateNutritionCalendarEntryDto {
  @IsString()
  @IsOptional()
  menuId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  dayContext?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
