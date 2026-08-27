import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class DimensionEvalDto {
  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateReportDto {
  @IsString()
  tenantId!: string;

  @IsString()
  prospectId!: string;

  @IsString()
  scoutId!: string;

  @IsOptional()
  @IsString()
  reportDate?: string;

  @IsOptional()
  @IsString()
  matchName?: string;

  @IsOptional()
  @IsString()
  matchDate?: string;

  @IsOptional()
  @IsString()
  competition?: string;

  @IsOptional()
  @IsNumber()
  minutesObserved?: number;

  @IsOptional()
  @IsString()
  positionPlayed?: string;

  @IsOptional()
  @IsString()
  observationType?: string;

  @IsOptional()
  @IsString()
  opponentStrength?: string;

  @IsOptional()
  @IsObject()
  technical?: Record<string, DimensionEvalDto>;

  @IsOptional()
  @IsObject()
  tactical?: Record<string, DimensionEvalDto>;

  @IsOptional()
  @IsObject()
  physical?: Record<string, DimensionEvalDto>;

  @IsOptional()
  @IsObject()
  mental?: Record<string, DimensionEvalDto>;

  @IsOptional()
  @IsObject()
  cognitive?: Record<string, DimensionEvalDto>;

  @IsOptional()
  @IsNumber()
  overallRating?: number;

  @IsOptional()
  @IsString()
  evaluationOutcome?: string;

  @IsString()
  recommendation!: string;

  @IsOptional()
  @IsString()
  strengths?: string;

  @IsOptional()
  @IsString()
  weaknesses?: string;

  @IsOptional()
  @IsString()
  risks?: string;

  @IsOptional()
  @IsString()
  scoutNotes?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  locationLabel?: string;

  @IsOptional()
  @IsBoolean()
  reverseGeocode?: boolean;

  @IsOptional()
  @IsBoolean()
  needsLodging?: boolean;

  @IsOptional()
  @IsString()
  presentationDate?: string;
}
