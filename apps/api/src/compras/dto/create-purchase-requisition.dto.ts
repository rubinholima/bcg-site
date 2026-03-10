import { IsString, IsOptional, IsArray, IsNumber, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class RequisitionItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @MaxLength(512)
  description: string;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  unit?: string;

  @IsNumber()
  @IsOptional()
  estimatedUnitPrice?: number;
}

export class CreatePurchaseRequisitionDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MaxLength(255)
  requestedByName: string;

  @IsString()
  @IsOptional()
  justification?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequisitionItemDto)
  items: RequisitionItemDto[];

  @IsNumber()
  @IsOptional()
  totalEstimated?: number;
}
