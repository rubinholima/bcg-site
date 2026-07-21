import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsArray,
  IsIn,
  IsNumber,
} from 'class-validator';
import { INVENTORY_KINDS } from '../inventory-kinds';

export class CreateProductDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  sku?: string;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  unit?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  stockMin?: number;

  @IsString()
  @IsOptional()
  @IsIn([...INVENTORY_KINDS])
  inventoryKind?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  squadTags?: string[];

  /** Quantidade inicial — exige initialUnitPrice se > 0 */
  @IsInt()
  @Min(0)
  @IsOptional()
  initialQuantity?: number;

  /** Preço unitário na entrada inicial (R$) */
  @IsNumber()
  @Min(0)
  @IsOptional()
  initialUnitPrice?: number;
}
