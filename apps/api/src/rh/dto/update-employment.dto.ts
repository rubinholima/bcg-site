import { IsString, IsOptional, IsNumber, IsDateString, IsObject, MaxLength } from 'class-validator';

export class UpdateEmploymentDto {
  @IsString()
  @IsOptional()
  jobRoleId?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  contractType?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  salaryBase?: number;

  @IsOptional()
  @IsObject()
  bankData?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @IsObject()
  athleteData?: Record<string, unknown>;

  @IsOptional()
  admissionChecklist?: unknown;

  @IsString()
  @IsOptional()
  terminationType?: string;

  @IsString()
  @IsOptional()
  terminationNotes?: string;

  @IsOptional()
  terminationChecklist?: unknown;
}
