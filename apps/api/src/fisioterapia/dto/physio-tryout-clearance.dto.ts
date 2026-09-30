import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreatePhysioTryoutClearanceDto {
  @IsString()
  tenantId!: string;

  @IsString()
  prospectId!: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;

  @IsOptional()
  @IsString()
  injuryHistory?: string;

  @IsObject()
  bilateralTests!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  manualStrengthTest?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsIn(['aprovado', 'reprovado', 'nao_liberado_temporario', 'nao_liberado_definitivo'])
  outcome!: 'aprovado' | 'reprovado' | 'nao_liberado_temporario' | 'nao_liberado_definitivo';

  @IsOptional()
  @IsString()
  evaluatedAt?: string;
}

export class UpdatePhysioTryoutClearanceDto {
  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;

  @IsOptional()
  @IsString()
  injuryHistory?: string;

  @IsOptional()
  @IsObject()
  bilateralTests?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  manualStrengthTest?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsIn(['aprovado', 'reprovado', 'nao_liberado_temporario', 'nao_liberado_definitivo'])
  outcome?: 'aprovado' | 'reprovado' | 'nao_liberado_temporario' | 'nao_liberado_definitivo';

  @IsOptional()
  @IsString()
  evaluatedAt?: string;
}
