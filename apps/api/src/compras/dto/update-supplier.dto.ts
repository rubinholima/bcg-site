import { IsString, IsOptional, MaxLength, IsIn, IsObject } from 'class-validator';

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  document?: string;

  @IsString()
  @IsIn(['pj', 'pf'])
  @IsOptional()
  personType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  tradeName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  taxId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  whatsapp?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  website?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsObject()
  @IsOptional()
  addressStructured?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  commercial?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  country?: string;

  @IsString()
  @IsIn(['active', 'inactive', 'blocked'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  supplierCategoryId?: string | null;

  @IsString()
  @IsOptional()
  notes?: string;
}
