import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateDepartmentDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  code?: string;
}
