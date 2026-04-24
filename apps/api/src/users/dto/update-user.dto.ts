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

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string | null;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(['super_admin', 'company_admin', 'editor', 'analista', 'diretoria', 'medico', 'psicologo', 'user'])
  @IsOptional()
  role?: UserRole;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  @IsOptional()
  password?: string;

  /** IDs de Tenant permitidos para este utilizador (vazio = remove restrição). Só super_admin / company_admin. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tenantIds?: string[];
}
