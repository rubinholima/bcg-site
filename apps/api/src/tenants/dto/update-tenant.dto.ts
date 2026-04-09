import { IsString, IsOptional, Matches, MaxLength, MinLength, IsNumber, IsBoolean } from 'class-validator';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug deve conter apenas letras minúsculas, números e hífens',
  })
  @MinLength(3)
  @MaxLength(100)
  slug?: string;

  @IsString()
  @IsOptional()
  kindId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  logoUrl?: string;

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

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  country?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  websiteUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  sofascoreTeamId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  footballDataTeamId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  apiFutebolTeamId?: string | null;

  @IsOptional()
  categories?: string[] | null;

  /** Nova App Key Omie (enviar junto com omieAppSecret para gravar; nunca retornada na leitura) */
  @IsString()
  @IsOptional()
  @MaxLength(64)
  omieAppKey?: string;

  /** Novo App Secret Omie */
  @IsString()
  @IsOptional()
  @MaxLength(512)
  omieAppSecret?: string;

  /** Se true, remove credenciais Omie desta empresa */
  @IsOptional()
  @IsBoolean()
  omieCredentialsClear?: boolean;
}
