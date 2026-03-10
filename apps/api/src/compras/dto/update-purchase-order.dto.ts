import { IsString, IsOptional, IsArray, IsNumber, IsDateString, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(512)
  description?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsOptional()
  unitPrice?: number;
}

export class UpdatePurchaseOrderDto {
  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  orderNumber?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsOptional()
  items?: OrderItemDto[];

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsDateString()
  @IsOptional()
  expectedDelivery?: string;

  /** draft | sent | approved | received | cancelled */
  @IsString()
  @IsOptional()
  status?: string;
}
