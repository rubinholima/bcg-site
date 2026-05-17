import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsArray,
  IsIn,
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

  @IsInt()
  @Min(0)
  @IsOptional()
  currentStock?: number;

  @IsString()
  @IsOptional()
  @IsIn([...INVENTORY_KINDS])
  inventoryKind?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  squadTags?: string[];
}
