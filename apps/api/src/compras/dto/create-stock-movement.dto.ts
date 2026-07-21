import { IsString, IsInt, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateStockMovementDto {
  @IsString()
  productId: string;

  /** Positivo = entrada, negativo = saída */
  @IsInt()
  quantity: number;

  /** purchase | requisition | adjustment */
  @IsString()
  type: string;

  /** Preço unitário na entrada (obrigatório quando quantity > 0) */
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
