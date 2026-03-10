import { IsString, IsInt, IsOptional, MaxLength } from 'class-validator';

export class CreateStockMovementDto {
  @IsString()
  productId: string;

  /** Positivo = entrada, negativo = saída */
  @IsInt()
  quantity: number;

  /** purchase | requisition | adjustment */
  @IsString()
  type: string;

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
