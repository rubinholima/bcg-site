import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  TRYOUT_DIRECT_ENTRY_SOURCES,
  TRYOUT_REFERRAL_SOURCES,
} from '../tryout-workflow.constants';

export class TryoutDuplicateSearchDto {
  @IsString()
  tenantId!: string;

  @IsOptional()
  @IsString()
  prospectId?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  athletePhone?: string;

  @IsOptional()
  @IsString()
  athleteEmail?: string;

  @IsOptional()
  @IsString()
  guardianPhone?: string;
}

export class TryoutDirectEntryDto {
  @IsString()
  tenantId!: string;

  @IsIn([...TRYOUT_DIRECT_ENTRY_SOURCES])
  arrivalReferralSource!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceDetails?: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  birthDate!: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  athletePhone?: string;

  @IsOptional()
  @IsString()
  athleteEmail?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @IsOptional()
  @IsString()
  guardianEmail?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  secondaryPositions?: string[];

  @IsString()
  arrivalAt!: string;

  @IsString()
  targetCategory!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reuseProspectId?: string;

  @IsOptional()
  @IsBoolean()
  confirmNewDespiteDuplicates?: boolean;
}

export class TryoutActivateLegacyDto {
  @IsString()
  arrivalAt!: string;

  @IsIn([...TRYOUT_REFERRAL_SOURCES])
  arrivalReferralSource!: string;

  @IsOptional()
  @IsString()
  sourceDetails?: string;
}
