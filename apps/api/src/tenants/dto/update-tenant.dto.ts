import { IsString, IsOptional, Matches, MaxLength, MinLength } from 'class-validator';

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
  @MaxLength(255)
  location?: string;
}
