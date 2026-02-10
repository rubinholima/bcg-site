import { IsString, IsNotEmpty, Matches, MaxLength, MinLength, IsOptional, IsNumber } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug deve conter apenas letras minúsculas, números e hífens',
  })
  @MinLength(3)
  @MaxLength(100)
  slug: string;

  @IsString()
  @IsNotEmpty()
  kindId: string;

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
}
