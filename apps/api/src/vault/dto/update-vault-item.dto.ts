import { IsString, IsOptional, IsIn, MaxLength, IsBoolean } from 'class-validator';

export class UpdateVaultItemDto {
  @IsOptional()
  @IsString()
  tenantId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  username?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string | null;

  @IsOptional()
  @IsString()
  secret?: string;

  /** Nova nota (texto). Omitir = manter. */
  @IsOptional()
  @IsString()
  notes?: string;

  /** true = apagar notas criptografadas. */
  @IsOptional()
  @IsBoolean()
  clearNotes?: boolean;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: 'active' | 'archived';
}
