import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateVaultItemDto {
  @IsOptional()
  @IsString()
  tenantId?: string | null;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  username?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string | null;

  @IsString()
  secret: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: 'active' | 'archived';
}
