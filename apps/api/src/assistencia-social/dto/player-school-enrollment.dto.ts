import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreatePlayerSchoolEnrollmentDto {
  @IsString()
  playerId: string;

  @IsString()
  schoolName: string;

  @IsString()
  @IsOptional()
  grade?: string;

  @IsString()
  @IsOptional()
  period?: string;

  @IsString()
  @IsOptional()
  shift?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  coordinatorName?: string;

  @IsString()
  @IsOptional()
  coordinatorEmail?: string;

  @IsString()
  @IsOptional()
  coordinatorPhone?: string;

  @IsString()
  @IsOptional()
  schoolYear?: string;

  @IsIn(['ativo', 'transferido', 'concluido'])
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdatePlayerSchoolEnrollmentDto {
  @IsString()
  @IsOptional()
  schoolName?: string;

  @IsString()
  @IsOptional()
  grade?: string;

  @IsString()
  @IsOptional()
  period?: string;

  @IsString()
  @IsOptional()
  shift?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  coordinatorName?: string;

  @IsString()
  @IsOptional()
  coordinatorEmail?: string;

  @IsString()
  @IsOptional()
  coordinatorPhone?: string;

  @IsString()
  @IsOptional()
  schoolYear?: string;

  @IsIn(['ativo', 'transferido', 'concluido'])
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
