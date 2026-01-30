import { IsString, IsNotEmpty, Matches, MaxLength, MinLength, IsOptional } from 'class-validator';

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
  @MaxLength(255)
  location?: string;
}
