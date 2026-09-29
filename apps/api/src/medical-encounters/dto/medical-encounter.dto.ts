import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MEDICAL_ENCOUNTER_STATUSES,
  MEDICAL_RTP_DECISIONS,
} from '../medical-encounter.constants';

export class MedicalPrescriptionItemDto {
  @IsString() medication!: string;
  @IsOptional() @IsString() presentation?: string;
  @IsOptional() @IsString() dose?: string;
  @IsOptional() @IsString() route?: string;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsString() duration?: string;
  @IsOptional() @IsString() instructions?: string;
}

export class MedicalEncounterAttachmentDto {
  @IsOptional() @IsString() label?: string;
  @IsString() fileUrl!: string;
  @IsOptional() @IsString() kind?: string;
}

export class MedicalExamRecordDto {
  @IsIn(['solicitado', 'resultado']) type!: 'solicitado' | 'resultado';
  @IsString() title!: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() fileUrl?: string;
  @IsOptional() @IsString() recordedAt?: string;
}

export class AddMedicalEvolutionDto {
  @IsString() note!: string;
}

export class CreateMedicalEncounterDto {
  @IsString() tenantId!: string;
  @IsString() playerId!: string;
  @IsOptional() @IsString() category?: string;
  @IsString() occurredAt!: string;
  @IsOptional() @IsString() physicianStaffId?: string;
  @IsOptional() @IsString() physicianName?: string;
  @IsOptional() @IsString() chiefComplaint?: string;
  @IsOptional() @IsString() anamnesis?: string;
  @IsOptional() @IsString() physicalExam?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() conduct?: string;
  @IsOptional() @IsString() examsRequested?: string;
  @IsOptional() @IsString() observations?: string;
  @IsOptional() @IsBoolean() restrictTraining?: boolean;
  @IsOptional() @IsBoolean() restrictMatch?: boolean;
  @IsOptional() @IsString() returnForecastAt?: string;
  @IsOptional() @IsBoolean() referPhysio?: boolean;
  @IsOptional() @IsString() referPhysioNotes?: string;
  @IsOptional() @IsString() referPhysioSessionId?: string;
  @IsOptional() @IsString() originEncounterId?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalExamRecordDto)
  examRecords?: MedicalExamRecordDto[];
  @IsOptional() @IsIn([...MEDICAL_RTP_DECISIONS]) rtpDecision?: string;
  @IsOptional() @IsString() medicalRtpReleasedAt?: string;
  @IsOptional() @IsString() medicalRtpNotes?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalEncounterAttachmentDto)
  attachments?: MedicalEncounterAttachmentDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalPrescriptionItemDto)
  prescriptions?: MedicalPrescriptionItemDto[];
  @IsOptional() @IsIn([...MEDICAL_ENCOUNTER_STATUSES]) status?: string;
}

export class UpdateMedicalEncounterDto extends CreateMedicalEncounterDto {
  @IsOptional() @IsString() editComment?: string;
}
