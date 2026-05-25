import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsArray,
  IsObject,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  tenantId: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  category?: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  photoUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  birthDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  nationality?: string;

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(250)
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(150)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(60)
  bmi?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(70)
  bodyFatPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(150)
  leanMassKg?: number;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  preferredFoot?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  jerseyNumber?: number;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  position?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fieldPositionX?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fieldPositionY?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  currentTeam?: string;

  @IsOptional()
  @IsArray()
  previousTeams?: string[];

  @IsOptional()
  @IsObject()
  seasonHistory?: unknown;

  @IsOptional()
  @IsObject()
  socialMedia?: unknown;

  @IsOptional()
  @IsInt()
  @Min(0)
  matchesPlayed?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  goals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  assists?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  yellowCards?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  redCards?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  marketValue?: number;

  @IsOptional()
  @IsArray()
  highlights?: string[];

  @IsString()
  @IsOptional()
  bioPT?: string;

  @IsString()
  @IsOptional()
  bioEN?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  externalId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  contactPhone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  emergencyContactEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  emergencyContactPhone?: string;

  @IsOptional()
  medicalHistory?: unknown; // array de registros ou { profile, records }

  @IsOptional()
  physiology?: unknown; // { profile?: {}, records: PhysiologyEntry[] }

  @IsOptional()
  @IsArray()
  psychologicalAssessment?: unknown[];

  @IsOptional()
  @IsArray()
  onlineConsultations?: unknown[];

  @IsOptional()
  @IsArray()
  evaluations?: unknown[];

  @IsString()
  @IsOptional()
  @MaxLength(64)
  status?: string;

  @IsString()
  @IsOptional()
  statusDetails?: string;

  @IsOptional()
  @IsDateString()
  statusUntil?: string;

  @IsOptional()
  @IsObject()
  heatMapData?: unknown;

  @IsString()
  @IsOptional()
  performanceAnalysis?: string;

  @IsOptional()
  @IsObject()
  analysisMetrics?: unknown;

  @IsOptional()
  @IsArray()
  images?: unknown[];

  @IsOptional()
  @IsObject()
  publicFields?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  registrationProfile?: Record<string, unknown>;
}
