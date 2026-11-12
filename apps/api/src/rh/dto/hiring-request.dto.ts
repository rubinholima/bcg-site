import { IsDateString, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRhHiringRequestDto {
  @IsString()
  @MinLength(1)
  tenantId!: string;

  @IsString()
  @MinLength(1)
  candidateName!: string;

  @IsOptional()
  @IsString()
  candidateCpf?: string;

  @IsOptional()
  @IsString()
  candidateEmail?: string;

  @IsOptional()
  @IsString()
  candidatePhone?: string;

  @IsString()
  @MinLength(1)
  contractType!: string;

  @IsOptional()
  @IsString()
  jobRoleId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsNumber()
  proposedSalary?: number;

  @IsOptional()
  @IsDateString()
  proposedStartDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRhHiringRequestDto {
  @IsOptional()
  @IsString()
  candidateName?: string;

  @IsOptional()
  @IsString()
  candidateCpf?: string;

  @IsOptional()
  @IsString()
  candidateEmail?: string;

  @IsOptional()
  @IsString()
  candidatePhone?: string;

  @IsOptional()
  @IsString()
  jobRoleId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsNumber()
  proposedSalary?: number;

  @IsOptional()
  @IsDateString()
  proposedStartDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TransitionRhHiringStatusDto {
  @IsString()
  @MinLength(1)
  toStatus!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
