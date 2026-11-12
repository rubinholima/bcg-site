import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class TransferEmployerDto {
  @IsString()
  @MinLength(1)
  newTenantId!: string;

  @IsDateString()
  transferDate!: string;

  @IsOptional()
  @IsString()
  jobRoleId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  contractType?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
