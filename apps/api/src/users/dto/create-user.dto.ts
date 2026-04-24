import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export type UserRole =
  | 'super_admin'
  | 'company_admin'
  | 'editor'
  | 'analista'
  | 'diretoria'
  | 'medico'
  | 'psicologo'
  | 'user';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string | null;

  @IsString()
  @MinLength(8, { message: 'Senha temporária deve ter no mínimo 8 caracteres' })
  temporaryPassword: string;

  @IsEnum(['super_admin', 'company_admin', 'editor', 'analista', 'diretoria', 'medico', 'psicologo', 'user'])
  role: UserRole;

  /** Empresas/clubes que o utilizador pode ver (vazio = sem restrição). Só super_admin / company_admin. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tenantIds?: string[];
}
