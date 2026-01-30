import { IsEnum } from 'class-validator';

export type UserRole = 'super_admin' | 'company_admin' | 'editor' | 'user';

export class UpdateRoleDto {
  @IsEnum(['super_admin', 'company_admin', 'editor', 'user'])
  role: UserRole;
}
