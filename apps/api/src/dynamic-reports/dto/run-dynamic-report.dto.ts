import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DynamicReportFiltersDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  situation?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  employeeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  season?: number;

  @IsOptional()
  @IsString()
  competition?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  referenceDate?: string;
}

export class RunDynamicReportDto {
  @IsString()
  @MinLength(1)
  tenantId!: string;

  @IsOptional()
  @IsString()
  presetId?: string;

  @IsOptional()
  @IsString()
  population?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DynamicReportFiltersDto)
  filters?: DynamicReportFiltersDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';

  @IsOptional()
  @IsIn(['category', 'department', 'cafeteria', 'none'])
  groupBy?: 'category' | 'department' | 'cafeteria' | 'none';
}
