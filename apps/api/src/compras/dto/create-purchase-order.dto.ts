import { IsString, IsOptional, IsArray, IsNumber, IsDateString, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @MaxLength(512)
  description: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  @IsOptional()
  unitPrice?: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  tenantId: string;

  @IsString()
  @IsOptional()
  requisitionId?: string;

  @IsString()
  supplierId: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  orderNumber?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsDateString()
  @IsOptional()
  expectedDelivery?: string;
}
