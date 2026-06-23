import { IsString, IsOptional, IsBoolean, IsObject, IsArray, IsIn, ValidateIf } from 'class-validator';

const STAFF_ROLES = ['psicologo', 'estagiario'] as const;

export class UpdatePsychologistDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  crpOrEquivalent?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  @IsIn(STAFF_ROLES)
  staffRole?: string;

  @IsOptional()
  @ValidateIf((_o, value) => value != null)
  @IsString()
  supervisorId?: string | null;

  @IsOptional()
  @IsBoolean()
  calendarBlocked?: boolean;

  @IsOptional()
  @IsArray()
  attendanceLog?: unknown[];

  @IsOptional()
  @IsObject()
  performanceSheet?: unknown;
}
