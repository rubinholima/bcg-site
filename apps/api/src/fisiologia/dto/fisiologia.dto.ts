import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SkinfoldsDto {
  @IsOptional() @IsNumber() se?: number;
  @IsOptional() @IsNumber() tr?: number;
  @IsOptional() @IsNumber() pe?: number;
  @IsOptional() @IsNumber() ax?: number;
  @IsOptional() @IsNumber() si?: number;
  @IsOptional() @IsNumber() ab?: number;
  @IsOptional() @IsNumber() cx?: number;
}

export class CreatePhysiologyAssessmentDto {
  @IsString() playerId!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsIn(['entrada', 'rotina']) assessmentType?: string;
  @IsString() assessedAt!: string;
  @IsOptional() @IsIn(['fisiologista', 'nutricionista', 'preparador_fisico']) evaluatorRole?: string;
  @IsOptional() @IsString() evaluatorName?: string;
  @IsOptional() @IsString() evaluatorStaffId?: string;
  @IsOptional() @IsNumber() weight?: number;
  @IsOptional() @IsNumber() height?: number;
  @IsOptional() @IsNumber() bmi?: number;
  @IsOptional() @ValidateNested() @Type(() => SkinfoldsDto) skinfolds?: SkinfoldsDto;
  @IsOptional() @IsString() protocol?: string;
  @IsOptional() @IsNumber() bodyFatPercent?: number;
  @IsOptional() @IsNumber() leanMassKg?: number;
  @IsOptional() @IsNumber() bodyMassKg?: number;
  @IsOptional() @IsIn(['acima', 'abaixo', 'ideal']) compositionStatus?: string;
  @IsOptional() @IsNumber() vo2max?: number;
  @IsOptional() @IsNumber() cmjCm?: number;
  @IsOptional() @IsNumber() illinoisSec?: number;
  @IsOptional() @IsNumber() tTestSec?: number;
  @IsOptional() @IsNumber() sprint10m?: number;
  @IsOptional() @IsNumber() sprint20m?: number;
  @IsOptional() @IsNumber() yoyoDistance?: number;
  @IsOptional() @IsNumber() rastPower?: number;
  @IsOptional() @IsString() mobilityNotes?: string;
  @IsOptional() @IsObject() physicalTests?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePhysiologyAssessmentDto extends CreatePhysiologyAssessmentDto {}

export class CreatePhysiologyHydrationDto {
  @IsString() playerId!: string;
  @IsString() recordedAt!: string;
  @IsIn(['treino', 'jogo']) contextType!: string;
  @IsOptional() @IsNumber() weightBefore?: number;
  @IsOptional() @IsNumber() weightAfter?: number;
  @IsOptional() @IsIn(['hidratado', 'desidratado', 'severo']) status?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePhysiologyHydrationDto extends CreatePhysiologyHydrationDto {}

export class PhysiologyLoadEntryDto {
  @IsString() playerId!: string;
  @IsOptional() @IsBoolean() present?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(10) rpe?: number;
  @IsOptional() @IsNumber() actualLoad?: number;
  @IsOptional() @IsInt() trainingMinutes?: number;
  @IsOptional() @IsInt() gameMinutes?: number;
  @IsOptional() @IsNumber() maxDistanceM?: number;
  @IsOptional() @IsNumber() maxSpeedKmh?: number;
  @IsOptional() @IsInt() sprintCount?: number;
  @IsOptional() @IsNumber() highIntensityDistanceM?: number;
  @IsOptional() @IsNumber() lowIntensityDistanceM?: number;
  @IsOptional() @IsNumber() sprintDistanceM?: number;
  @IsOptional() @IsString() gpsImportLabel?: string;
  @IsOptional() @IsObject() gpsData?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
}

export class CreatePhysiologyLoadSessionDto {
  @IsString() tenantId!: string;
  @IsString() category!: string;
  @IsString() sessionDate!: string;
  @IsIn(['treino', 'jogo']) sessionType!: string;
  @IsOptional() @IsString() period?: string;
  @IsOptional() @IsString() trainingType?: string;
  @IsOptional() @IsString() staffId?: string;
  @IsOptional() @IsString() staffName?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PhysiologyLoadEntryDto) entries!: PhysiologyLoadEntryDto[];
}

export class UpdatePhysiologyLoadSessionDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() sessionDate?: string;
  @IsOptional() @IsIn(['treino', 'jogo']) sessionType?: string;
  @IsOptional() @IsString() period?: string;
  @IsOptional() @IsString() trainingType?: string;
  @IsOptional() @IsString() staffId?: string;
  @IsOptional() @IsString() staffName?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PhysiologyLoadEntryDto) entries?: PhysiologyLoadEntryDto[];
}
