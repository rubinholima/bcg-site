import { IsString, IsOptional, IsBoolean, IsObject, IsArray } from 'class-validator';

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
  @IsBoolean()
  calendarBlocked?: boolean;

  @IsOptional()
  @IsArray()
  attendanceLog?: unknown[];

  @IsOptional()
  @IsObject()
  performanceSheet?: unknown;
}
