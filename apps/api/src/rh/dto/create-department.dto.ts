import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  code?: string;
}
