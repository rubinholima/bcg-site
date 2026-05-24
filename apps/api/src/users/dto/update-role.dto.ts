import { IsIn } from 'class-validator';

export const USER_ROLES = [
  'super_admin',
  'company_admin',
  'editor',
  'gerente',
  'administrativo',
  'analista',
  'diretoria',
  'medico',
  'psicologo',
  'comissao',
  'user',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export class UpdateRoleDto {
  @IsIn(USER_ROLES)
  role: UserRole;
}
