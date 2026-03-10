import { IsString, IsOptional, IsArray, IsNumber, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class RequisitionItemDto {
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

  @IsString()
  @IsOptional()
  @MaxLength(16)
  unit?: string;

  @IsNumber()
  @IsOptional()
  estimatedUnitPrice?: number;
}

export class UpdatePurchaseRequisitionDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  requestedByName?: string;

  @IsString()
  @IsOptional()
  justification?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequisitionItemDto)
  @IsOptional()
  items?: RequisitionItemDto[];

  @IsNumber()
  @IsOptional()
  totalEstimated?: number;

  /** draft | sent | quotation | approved | rejected | ordered | received */
  @IsString()
  @IsOptional()
  status?: string;
}
