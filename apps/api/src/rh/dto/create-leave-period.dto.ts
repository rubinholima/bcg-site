import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreateLeavePeriodDto {
  @IsString()
  employmentId: string;

  @IsString()
  @MaxLength(32)
  type: string; // vacation | sick_leave | maternity | accident | other

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

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
