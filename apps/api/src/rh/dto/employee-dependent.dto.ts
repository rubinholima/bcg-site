import { Type } from 'class-transformer';
import { IsString, IsOptional, MaxLength, IsDateString, ValidateNested } from 'class-validator';

export class CreateEmployeeDependentDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsDateString()
  birthDate: string;

  @IsString()
  @IsOptional()
  birthCertificateFileUrl?: string;

  @IsString()
  @IsOptional()
  schoolAttendanceFileUrl?: string;

  @IsString()
  @IsOptional()
  vaccinationCardFileUrl?: string;
}

export class UpdateEmployeeDependentDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  birthCertificateFileUrl?: string;

  @IsString()
  @IsOptional()
  schoolAttendanceFileUrl?: string;

  @IsString()
  @IsOptional()
  vaccinationCardFileUrl?: string;
}

export class SyncEmployeeDependentsDto {
  @ValidateNested({ each: true })
  @Type(() => CreateEmployeeDependentDto)
  dependents: CreateEmployeeDependentDto[];
}
