import { IsArray, IsIn, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

const SESSION_TYPES = ['presencial', 'grupo', 'relatorio_semanal'] as const;
const SESSION_STATUSES = ['scheduled', 'completed', 'cancelled'] as const;

export class PsychologyAttendanceRowDto {
  @IsString()
  playerId: string;

  @IsOptional()
  @IsString()
  playerName?: string;

  @IsOptional()
  present?: boolean;

  @IsOptional()
  @IsString()
  individualNotes?: string;
}

export class CreatePsychologySessionDto {
  @IsString()
  tenantId: string;

  @IsString()
  @IsIn(SESSION_TYPES)
  sessionType: string;

  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsString()
  psychologistId?: string;

  @IsOptional()
  @IsString()
  estagiarioId?: string;

  @IsOptional()
  @IsString()
  psychologistName?: string;

  @IsOptional()
  @IsString()
  estagiarioName?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  @IsIn(SESSION_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  periodStart?: string;

  @IsOptional()
  @IsString()
  periodEnd?: string;

  @IsOptional()
  @IsString()
  categoriesLabel?: string;

  @IsOptional()
  @IsString()
  activities?: string;

  @IsOptional()
  @IsString()
  individualDemands?: string;

  @IsOptional()
  @IsString()
  weeklyDevelopment?: string;

  @IsOptional()
  @IsString()
  identifiedDemands?: string;

  @IsOptional()
  @IsString()
  nextWeekPlanning?: string;

  @IsOptional()
  @IsString()
  finalSummary?: string;

  @IsOptional()
  @IsString()
  generalNotes?: string;

  @IsOptional()
  @IsString()
  groupSummary?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PsychologyAttendanceRowDto)
  attendance?: PsychologyAttendanceRowDto[];

  @IsOptional()
  @IsInt()
  durationSeconds?: number;

  @IsOptional()
  syncAgenda?: boolean;
}

export class UpdatePsychologySessionDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  @IsIn(SESSION_TYPES)
  sessionType?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsString()
  psychologistId?: string;

  @IsOptional()
  @IsString()
  estagiarioId?: string;

  @IsOptional()
  @IsString()
  psychologistName?: string;

  @IsOptional()
  @IsString()
  estagiarioName?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  @IsIn(SESSION_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  periodStart?: string;

  @IsOptional()
  @IsString()
  periodEnd?: string;

  @IsOptional()
  @IsString()
  categoriesLabel?: string;

  @IsOptional()
  @IsString()
  activities?: string;

  @IsOptional()
  @IsString()
  individualDemands?: string;

  @IsOptional()
  @IsString()
  weeklyDevelopment?: string;

  @IsOptional()
  @IsString()
  identifiedDemands?: string;

  @IsOptional()
  @IsString()
  nextWeekPlanning?: string;

  @IsOptional()
  @IsString()
  finalSummary?: string;

  @IsOptional()
  @IsString()
  generalNotes?: string;

  @IsOptional()
  @IsString()
  groupSummary?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PsychologyAttendanceRowDto)
  attendance?: PsychologyAttendanceRowDto[];

  @IsOptional()
  @IsInt()
  durationSeconds?: number;
}
