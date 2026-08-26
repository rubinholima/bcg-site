import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateNutritionCalendarEntryDto {
  @IsString()
  tenantId: string;

  @ValidateIf((o: CreateNutritionCalendarEntryDto) => !o.applyToAllCategories)
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  applyToAllCategories?: boolean;

  @IsDateString()
  date: string;

  @IsString()
  menuId: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  dayContext?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  /** 0=Dom … 6=Sáb — repetir cardápio nos dias selecionados até repeatUntilDate */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  repeatWeekdays?: number[];

  @IsOptional()
  @IsDateString()
  repeatUntilDate?: string;
}
