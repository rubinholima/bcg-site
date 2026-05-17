import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  IsDateString,
  IsIn,
  Min,
} from 'class-validator';

export class UpdateFinanceiroLancamentoDto {
  @IsString()
  @IsOptional()
  @IsIn(['pagar', 'receber'])
  tipo?: 'pagar' | 'receber';

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
  @MaxLength(2000)
  descricao?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  valor?: number;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsDateString()
  @IsOptional()
  settledAt?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  categoria?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  referencia?: string | null;

  @IsString()
  @IsOptional()
  notas?: string | null;
}
