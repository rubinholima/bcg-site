import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PhysioSessionRegionDto {
  @IsString()
  regionId!: string;

  @IsOptional()
  @IsIn(['E', 'D', 'bilateral'])
  side?: string;

  @IsOptional()
  @IsIn(['front', 'back'])
  bodyMapView?: string;

  @IsOptional()
  @IsNumber()
  bodyMapX?: number;

  @IsOptional()
  @IsNumber()
  bodyMapY?: number;
}

export class PhysioSessionDiagnosisItemDto {
  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsString()
  diagnosisId?: string;

  @IsOptional()
  @IsString()
  diagnosisLabel?: string;
}

export class PhysioSessionTreatmentItemDto {
  @IsOptional()
  @IsString()
  treatmentId?: string;

  @IsOptional()
  @IsString()
  treatmentLabel?: string;
}

export class PhysioGroupAttendanceDto {
  @IsString()
  playerId!: string;

  @IsOptional()
  @IsString()
  playerName?: string;

  @IsOptional()
  present?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePhysioGroupSessionDto {
  @IsString()
  tenantId!: string;

  @IsString()
  category!: string;

  @IsString()
  sessionDate!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhysioGroupAttendanceDto)
  attendance!: PhysioGroupAttendanceDto[];
}

export class UpdatePhysioGroupSessionDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  sessionDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhysioGroupAttendanceDto)
  attendance?: PhysioGroupAttendanceDto[];
}

export class CreatePhysioDiagnosisDto {
  @IsString()
  @MinLength(1)
  regionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class CreatePhysioTreatmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  equipment?: string;
}

export class PhysioAttachmentDto {
  @IsString()
  name!: string;

  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class CreatePhysioSessionDto {
  @IsString()
  tenantId!: string;

  @IsString()
  playerId!: string;

  @IsOptional()
  @IsString()
  category?: string;

  /** Região principal (legado) — use `regions` para multi-lesão. */
  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhysioSessionRegionDto)
  regions?: PhysioSessionRegionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhysioSessionDiagnosisItemDto)
  diagnoses?: PhysioSessionDiagnosisItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhysioSessionTreatmentItemDto)
  treatments?: PhysioSessionTreatmentItemDto[];

  @IsOptional()
  @IsIn(['E', 'D', 'bilateral'])
  side?: string;

  @IsOptional()
  @IsIn(['front', 'back'])
  bodyMapView?: string;

  @IsOptional()
  @IsNumber()
  bodyMapX?: number;

  @IsOptional()
  @IsNumber()
  bodyMapY?: number;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScore?: number;

  @IsOptional()
  @IsString()
  diagnosisId?: string;

  @IsOptional()
  @IsString()
  diagnosisLabel?: string;

  @IsOptional()
  @IsString()
  treatmentId?: string;

  @IsOptional()
  @IsString()
  treatmentLabel?: string;

  @IsOptional()
  @IsString()
  treatmentNotes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDays?: number;

  @IsOptional()
  @IsString()
  estimatedEndDate?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;

  @IsOptional()
  @IsBoolean()
  needsTransition?: boolean;

  @IsOptional()
  @IsArray()
  attachments?: PhysioAttachmentDto[];
}

export class UpdatePhysioSessionDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhysioSessionRegionDto)
  regions?: PhysioSessionRegionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhysioSessionDiagnosisItemDto)
  diagnoses?: PhysioSessionDiagnosisItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhysioSessionTreatmentItemDto)
  treatments?: PhysioSessionTreatmentItemDto[];

  @IsOptional()
  @IsIn(['E', 'D', 'bilateral'])
  side?: string;

  @IsOptional()
  @IsIn(['front', 'back'])
  bodyMapView?: string;

  @IsOptional()
  @IsNumber()
  bodyMapX?: number;

  @IsOptional()
  @IsNumber()
  bodyMapY?: number;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScore?: number;

  @IsOptional()
  @IsString()
  diagnosisId?: string;

  @IsOptional()
  @IsString()
  diagnosisLabel?: string;

  @IsOptional()
  @IsString()
  treatmentId?: string;

  @IsOptional()
  @IsString()
  treatmentLabel?: string;

  @IsOptional()
  @IsString()
  treatmentNotes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDays?: number;

  @IsOptional()
  @IsString()
  estimatedEndDate?: string | null;

  @IsOptional()
  @IsIn(['active', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsIn(['alta', 'em_tratamento', 'nao_apto'])
  disposition?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;

  @IsOptional()
  @IsBoolean()
  needsTransition?: boolean;

  @IsOptional()
  @IsArray()
  attachments?: PhysioAttachmentDto[];
}

export class CreatePhysioTransitionEntryDto {
  @IsString()
  sessionDate!: string;

  @IsString()
  workType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  workTypeLabel?: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  activities?: string;

  @IsBoolean()
  stillFeelsPain!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  evolutionScore?: number;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;
}

export class UpdatePhysioTransitionEntryDto {
  @IsOptional()
  @IsString()
  sessionDate?: string;

  @IsOptional()
  @IsString()
  workType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  workTypeLabel?: string | null;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  objective?: string | null;

  @IsOptional()
  @IsString()
  activities?: string | null;

  @IsOptional()
  @IsBoolean()
  stillFeelsPain?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  evolutionScore?: number | null;

  @IsOptional()
  @IsString()
  staffId?: string | null;

  @IsOptional()
  @IsString()
  staffName?: string | null;
}

export class SetPhysioDispositionDto {
  @IsIn(['alta', 'em_tratamento', 'nao_apto'])
  disposition!: 'alta' | 'em_tratamento' | 'nao_apto';
}

export class AddPhysioEvolutionDto {
  @IsString()
  @MinLength(1)
  note!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScore?: number;
}

export class CreatePhysioGameAttendanceDto {
  @IsString()
  tenantId!: string;

  @IsString()
  playerId!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  gameDate!: string;

  @IsIn(['concentracao', 'pre_jogo', 'primeiro_tempo', 'intervalo', 'segundo_tempo', 'pos_jogo'])
  phase!: string;

  @IsIn(['tratamento', 'preparo_preventivo'])
  careCategory!: string;

  @IsString()
  procedureKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  procedureLabel?: string;

  @IsOptional()
  @IsIn(['estabilizar', 'proteger', 'reforcar_musculatura', 'limitar_movimento'])
  treatmentReason?: string;

  @IsString()
  bodyLocation!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bodyLocationLabel?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;
}

export class UpdatePhysioGameAttendanceDto {
  @IsOptional()
  @IsIn(['concentracao', 'pre_jogo', 'primeiro_tempo', 'intervalo', 'segundo_tempo', 'pos_jogo'])
  phase?: string;

  @IsOptional()
  @IsIn(['tratamento', 'preparo_preventivo'])
  careCategory?: string;

  @IsOptional()
  @IsString()
  procedureKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  procedureLabel?: string;

  @IsOptional()
  @IsIn(['estabilizar', 'proteger', 'reforcar_musculatura', 'limitar_movimento'])
  treatmentReason?: string | null;

  @IsOptional()
  @IsString()
  bodyLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bodyLocationLabel?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  staffId?: string | null;

  @IsOptional()
  @IsString()
  staffName?: string | null;
}

export class PhysioEvaluationTestDto {
  @IsString()
  testType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  testTypeLabel?: string;

  @IsString()
  bodyLocation!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bodyLocationLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  score?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePhysioPlayerEvaluationDto {
  @IsString()
  tenantId!: string;

  @IsString()
  playerId!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsIn(['pre_temporada', 'inter_temporada', 'pos_temporada', 'desligamento'])
  context!: string;

  @IsOptional()
  @IsString()
  finalObservations?: string;

  @IsOptional()
  @IsIn(['aprovado', 'reprovado'])
  outcome?: string;

  @IsOptional()
  @IsString()
  evaluatedAt?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhysioEvaluationTestDto)
  tests!: PhysioEvaluationTestDto[];
}

export class CreatePhysioPlayerEvaluationBatchDto {
  @IsString()
  tenantId!: string;

  @IsArray()
  @IsString({ each: true })
  playerIds!: string[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsIn(['pre_temporada', 'inter_temporada', 'pos_temporada', 'desligamento'])
  context!: string;

  @IsOptional()
  @IsString()
  finalObservations?: string;

  @IsOptional()
  @IsIn(['aprovado', 'reprovado'])
  outcome?: string;

  @IsOptional()
  @IsString()
  evaluatedAt?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhysioEvaluationTestDto)
  tests!: PhysioEvaluationTestDto[];
}

export class UpdatePhysioPlayerEvaluationDto {
  @IsOptional()
  @IsIn(['pre_temporada', 'inter_temporada', 'pos_temporada', 'desligamento'])
  context?: string;

  @IsOptional()
  @IsString()
  finalObservations?: string | null;

  @IsOptional()
  @IsIn(['aprovado', 'reprovado'])
  outcome?: string | null;

  @IsOptional()
  @IsString()
  evaluatedAt?: string;

  @IsOptional()
  @IsString()
  staffId?: string | null;

  @IsOptional()
  @IsString()
  staffName?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhysioEvaluationTestDto)
  tests?: PhysioEvaluationTestDto[];
}
