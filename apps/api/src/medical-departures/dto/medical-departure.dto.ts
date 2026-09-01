import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  MEDICAL_DEPARTURE_CARE_TYPES,
  MEDICAL_DEPARTURE_STATUSES,
  MEDICAL_DEPARTURE_TRANSPORT_MODES,
} from '../medical-departure.constants';

export class CreateMedicalDepartureDto {
  @IsString() tenantId!: string;
  @IsString() playerId!: string;
  @IsOptional() @IsString() category?: string;
  @IsString() departedAt!: string;
  @IsOptional() @IsString() returnedAt?: string;
  @IsString() destination!: string;
  @IsIn([...MEDICAL_DEPARTURE_CARE_TYPES]) careType!: string;
  @IsString() reason!: string;
  @IsOptional() @IsString() careSummary?: string;
  @IsIn([...MEDICAL_DEPARTURE_TRANSPORT_MODES]) transportMode!: string;
  @IsOptional() @IsString() transportNotes?: string;
  @IsOptional() @IsString() companionStaffId?: string;
  @IsOptional() @IsString() companionName?: string;
  @IsOptional() @IsString() companionPhone?: string;
  @IsOptional() @IsIn([...MEDICAL_DEPARTURE_STATUSES]) status?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) documentIds?: string[];
}

export class UpdateMedicalDepartureDto extends CreateMedicalDepartureDto {}

export class RegisterMedicalDepartureReturnDto {
  @IsOptional() @IsString() returnedAt?: string;
  @IsOptional() @IsString() careSummary?: string;
  @IsOptional() @IsString() notes?: string;
}
