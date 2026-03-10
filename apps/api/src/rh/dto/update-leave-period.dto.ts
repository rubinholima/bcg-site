import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class UpdateLeavePeriodDto {
  @IsString()
  @IsOptional()
  @MaxLength(32)
  type?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  documentRef?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  catNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  status?: string;
}
