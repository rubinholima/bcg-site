import { IsBoolean, IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateJobRoleDto {
  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  type?: string;

  @IsOptional()
  @IsBoolean()
  forFootball?: boolean;
}
