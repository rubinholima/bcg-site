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
} from 'class-validator';

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
