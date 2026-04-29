import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { UserRole } from './update-role.dto';
import { USER_ROLES } from './update-role.dto';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string | null;

  @IsString()
  @MinLength(8, { message: 'Senha temporária deve ter no mínimo 8 caracteres' })
  temporaryPassword: string;

  @IsIn([...USER_ROLES])
  role: UserRole;

  /** Empresas/clubes que o utilizador pode ver (vazio = sem restrição). Só super_admin / company_admin. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tenantIds?: string[];
}
