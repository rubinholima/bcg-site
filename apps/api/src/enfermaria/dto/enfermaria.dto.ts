import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NursingAttachmentDto {
  @IsString() label!: string;
  @IsString() fileUrl!: string;
  @IsOptional() @IsIn(['exame', 'pedido', 'outro']) kind?: string;
}

export class NursingSessionDiagnosisItemDto {
  @IsOptional() @IsString() diagnosisId?: string;
  @IsOptional() @IsString() diagnosisLabel?: string;
}

export class NursingSessionTreatmentItemDto {
  @IsOptional() @IsString() treatmentId?: string;
  @IsOptional() @IsString() treatmentLabel?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsNumber() @Min(0) quantityUsed?: number;
  @IsOptional() @IsBoolean() deductStock?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class CreateNursingDiagnosisDto {
  @IsString() name!: string;
}

export class CreateNursingTreatmentDto {
  @IsString() name!: string;
  @IsOptional() @IsIn(['medicamento', 'procedimento', 'curativo']) kind?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() defaultUnit?: string;
}

export class CreateNursingSessionDto {
  @IsString() tenantId!: string;
  @IsString() playerId!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() attendedAt?: string;
  @IsOptional() @IsString() symptoms?: string;
  @IsOptional() @IsString() nurseStaffId?: string;
  @IsOptional() @IsString() nurseName?: string;
  @IsOptional() @IsInt() @Min(1) estimatedDays?: number;
  @IsOptional() @IsString() estimatedEndDate?: string;
  @IsOptional() @IsBoolean() exemptFromTraining?: boolean;
  @IsOptional() @IsString() treatmentNotes?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => NursingAttachmentDto) attachments?: NursingAttachmentDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => NursingSessionDiagnosisItemDto) diagnoses?: NursingSessionDiagnosisItemDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => NursingSessionTreatmentItemDto) treatments?: NursingSessionTreatmentItemDto[];
}

export class UpdateNursingSessionDto extends CreateNursingSessionDto {
  @IsOptional() @IsIn(['active', 'completed', 'cancelled']) status?: string;
}
