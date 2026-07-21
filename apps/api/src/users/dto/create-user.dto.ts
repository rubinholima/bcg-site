import { IsArray, IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^[a-z0-9][a-z0-9._-]{2,31}$/, {
    message:
      'Username inválido. Use 3–32 caracteres: letras minúsculas, números, ponto, hífen ou underscore.',
  })
  username: string;

  @IsString()
  @IsOptional()
  name?: string | null;

  @IsString()
  role: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tenantIds?: string[];
}
