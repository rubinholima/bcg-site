import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

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
}
