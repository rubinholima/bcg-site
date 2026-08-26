import { IsArray, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class RepeatNutritionCalendarDto {
  @IsString()
  tenantId: string;

  @IsDateString()
  sourceDate: string;

  @IsArray()
  @IsInt({ each: true })
  weekdays: number[];

  @IsDateString()
  untilDate: string;

  /** Se informado, replica só esta categoria; senão, todas do dia base */
  @IsOptional()
  @IsString()
  categoryId?: string;
}
