import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProspectDto {
  @IsString()
  tenantId!: string;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsString()
  scoutId?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryPositions?: string[];

  @IsOptional()
  @IsString()
  preferredFoot?: string;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  currentClub?: string;

  @IsOptional()
  @IsString()
  competition?: string;

  @IsOptional()
  @IsString()
  competitionLevel?: string;

  @IsOptional()
  @IsString()
  contractSituation?: string;

  @IsOptional()
  @IsString()
  contractEndDate?: string;

  @IsOptional()
  @IsString()
  agentName?: string;

  @IsOptional()
  @IsString()
  agentPhone?: string;

  @IsOptional()
  @IsString()
  agentEmail?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  sourceDetails?: string;

  @IsOptional()
  @IsString()
  targetCategory?: string;

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
  @IsObject()
  profileLinks?: Record<string, string>;

  @IsOptional()
  @IsString()
  notes?: string;
}
