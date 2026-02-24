import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export type UserRole = 'super_admin' | 'company_admin' | 'editor' | 'user';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string | null;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(['super_admin', 'company_admin', 'editor', 'user'])
  @IsOptional()
  role?: UserRole;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  @IsOptional()
  password?: string;
}
