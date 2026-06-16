import { IsArray, IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import type { UserRole } from './update-role.dto';
import { USER_ROLES } from './update-role.dto';

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

  @IsIn([...USER_ROLES])
  role: UserRole;

  /** Empresas/clubes que o utilizador pode ver (vazio = sem restrição). Só super_admin / company_admin. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tenantIds?: string[];
}
