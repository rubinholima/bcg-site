import { IsString, MinLength } from 'class-validator';

export type UserRole = string;

export class UpdateRoleDto {
  @IsString()
  @MinLength(2)
  role: string;
}
