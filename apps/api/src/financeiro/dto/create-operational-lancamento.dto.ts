import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CreateFinanceiroLancamentoDto } from './create-financeiro-lancamento.dto';

export class CreateOperationalLancamentoDto extends CreateFinanceiroLancamentoDto {
  @IsString()
  @IsOptional()
  financeAccountId?: string;

  @IsString()
  @IsOptional()
  financeCategoryId?: string;

  @IsString()
  @IsOptional()
  financePaymentMethodId?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  @IsIn(['BOLETO', 'INVOICE', 'RECEIPT', 'OTHER'])
  documentType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  documentNumber?: string;

  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @IsDateString()
  @IsOptional()
  competenceDate?: string;

  @IsDateString()
  @IsOptional()
  scheduledPaymentDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  originalAmount?: number;

  @IsString()
  @IsOptional()
  boletoBarcode?: string;

  @IsString()
  @IsOptional()
  boletoDigitableLine?: string;

  @IsString()
  @IsOptional()
  boletoDocumentId?: string;
}
