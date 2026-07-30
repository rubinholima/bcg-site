import {
  IsArray,
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
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;

  @IsOptional()
  @IsArray()
  attachments?: PhysioAttachmentDto[];
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
