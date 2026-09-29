import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  INSTALLMENT_STATUSES,
  NEGOTIATION_STATUSES,
  NEGOTIATION_TYPES,
} from '../player-negotiation.constants';

export class NegotiationInstallmentDto {
  @IsNumber()
  @Min(1)
  sequence: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsIn(INSTALLMENT_STATUSES)
  status?: string;
}

export class CreatePlayerNegotiationDto {
  @IsString()
  tenantId: string;

  @IsString()
  playerId: string;

  @IsString()
  @IsIn(NEGOTIATION_TYPES)
  negotiationType: string;

  @IsOptional()
  @IsIn(NEGOTIATION_STATUSES)
  status?: string;

  @IsString()
  @MaxLength(512)
  counterpartyName: string;

  @IsOptional()
  @IsString()
  visitingTeamId?: string;

  @IsOptional()
  @IsNumber()
  negotiatedPercentage?: number;

  @IsOptional()
  @IsNumber()
  retainedPercentage?: number;

  @IsOptional()
  @IsNumber()
  totalValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsDateString()
  negotiatedAt?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @IsOptional()
  @IsDateString()
  loanEndDate?: string;

  @IsOptional()
  @IsBoolean()
  hasPurchaseOption?: boolean;

  @IsOptional()
  @IsDateString()
  purchaseOptionDeadline?: string;

  @IsOptional()
  @IsString()
  purchaseOptionTerms?: string;

  @IsOptional()
  futureAcquisitionRights?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  paymentTermsSummary?: string;

  @IsOptional()
  @IsString()
  clauses?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  responsibleUserId?: string;

  @IsOptional()
  @IsString()
  responsibleName?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NegotiationInstallmentDto)
  installments?: NegotiationInstallmentDto[];
}

export class UpdatePlayerNegotiationDto {
  @IsOptional()
  @IsIn(NEGOTIATION_TYPES)
  negotiationType?: string;

  @IsOptional()
  @IsIn(NEGOTIATION_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  visitingTeamId?: string | null;

  @IsOptional()
  @IsNumber()
  negotiatedPercentage?: number | null;

  @IsOptional()
  @IsNumber()
  retainedPercentage?: number | null;

  @IsOptional()
  @IsNumber()
  totalValue?: number | null;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  negotiatedAt?: string | null;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null;

  @IsOptional()
  @IsDateString()
  effectiveUntil?: string | null;

  @IsOptional()
  @IsDateString()
  loanEndDate?: string | null;

  @IsOptional()
  @IsBoolean()
  hasPurchaseOption?: boolean;

  @IsOptional()
  @IsDateString()
  purchaseOptionDeadline?: string | null;

  @IsOptional()
  @IsString()
  purchaseOptionTerms?: string | null;

  @IsOptional()
  futureAcquisitionRights?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  paymentTermsSummary?: string | null;

  @IsOptional()
  @IsString()
  clauses?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  responsibleUserId?: string | null;

  @IsOptional()
  @IsString()
  responsibleName?: string | null;
}

export class CreateInstallmentFinanceiroDto {
  @IsString()
  @IsIn(['pagar', 'receber'])
  tipo: 'pagar' | 'receber';

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  contraparte?: string;
}

export class AddNegotiationDocumentDto {
  @IsString()
  name: string;

  @IsString()
  fileUrl: string;

  @IsOptional()
  @IsString()
  fileKey?: string;

  @IsOptional()
  @IsString()
  legalDocumentId?: string;
}
