import { IsArray, IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string | null;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @Matches(/^[a-z0-9][a-z0-9._-]{2,31}$/, {
    message:
      'Username inválido. Use 3–32 caracteres: letras minúsculas, números, ponto, hífen ou underscore.',
  })
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  @IsOptional()
  password?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tenantIds?: string[];
}
