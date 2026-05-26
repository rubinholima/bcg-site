import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  IsDateString,
  IsIn,
  Min,
} from 'class-validator';

export class CreateFinanceiroLancamentoDto {
  @IsString()
  tenantId: string;

  @IsString()
  @IsIn(['pagar', 'receber'])
  tipo: 'pagar' | 'receber';

  @IsString()
  @IsOptional()
  @IsIn(['pendente', 'pago', 'cancelado'])
  status?: 'pendente' | 'pago' | 'cancelado';

  @IsString()
  @IsOptional()
  @MaxLength(512)
  contraparte?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @MaxLength(2000)
  descricao: string;

  @IsNumber()
  @Min(0)
  valor: number;

  @IsDateString()
  dueDate: string;

  @IsDateString()
  @IsOptional()
  settledAt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  categoria?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  referencia?: string;

  @IsString()
  @IsOptional()
  notas?: string;
}
