import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateJobRoleDto {
  @IsString()
  tenantId: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  code?: string;

  @IsString()
  @MaxLength(32)
  type: string; // staff | athlete
}
