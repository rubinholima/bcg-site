import { IsString, IsOptional, IsNumber, IsDateString, IsObject, MaxLength } from 'class-validator';

export class CreateEmploymentDto {
  @IsString()
  tenantId: string;

  @IsString()
  employeeId: string;

  @IsString()
  jobRoleId: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @MaxLength(32)
  contractType: string; // CLT | PJ | estagio | atleta

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  salaryBase: number;

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
}
