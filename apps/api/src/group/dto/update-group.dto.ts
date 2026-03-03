import { IsString, IsOptional, MaxLength, IsObject } from 'class-validator';

export class UpdateGroupDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  logoUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string;

  /** Conteúdo modular da página inicial (blocos). Grupo Master apenas. */
  @IsObject()
  @IsOptional()
  homeContent?: { blocks?: unknown[] };

  /** Configurações padrão por tipo de módulo (Record<type, config>). Usadas ao adicionar módulo em páginas. */
  @IsObject()
  @IsOptional()
  moduleDefaults?: Record<string, Record<string, unknown>>;
}
