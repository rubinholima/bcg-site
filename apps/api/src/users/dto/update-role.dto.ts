import { IsIn } from 'class-validator';

export const USER_ROLES = [
  'super_admin',
  'company_admin',
  'editor',
  'analista',
  'diretoria',
  'medico',
  'psicologo',
  'user',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export class UpdateRoleDto {
  @IsIn(USER_ROLES)
  role: UserRole;
}
