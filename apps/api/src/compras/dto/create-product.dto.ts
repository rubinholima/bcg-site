import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

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
}
