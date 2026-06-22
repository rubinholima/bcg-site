import { IsString, IsOptional, IsBoolean, IsObject, IsIn, IsArray } from 'class-validator';

const STAFF_ROLES = ['psicologo', 'estagiario'] as const;

export class CreatePsychologistDto {
  @IsString()
  name: string;

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
  @IsString()
  supervisorId?: string;

  @IsOptional()
  @IsArray()
  categories?: string[];

  @IsOptional()
  @IsBoolean()
  calendarBlocked?: boolean;

  @IsOptional()
  @IsObject()
  attendanceLog?: unknown;

  @IsOptional()
  @IsObject()
  performanceSheet?: unknown;
}
