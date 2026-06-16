import { IsArray, IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { USER_ROLES } from './update-role.dto';
import type { UserRole as UpdateRoleUserRole } from './update-role.dto';

/** Mesmo tipo que update-role ao alterar papel no PATCH de usuário. */
export type UserRole = UpdateRoleUserRole;

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

  @IsIn([...USER_ROLES])
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
