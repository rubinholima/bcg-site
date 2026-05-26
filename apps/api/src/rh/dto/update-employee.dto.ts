import { IsString, IsOptional, IsArray, MaxLength, IsDateString, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmployeeAddressDto } from './employee-address.dto';

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  cpf?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  rg?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  phone?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  type?: string;

  @IsOptional()
  @IsArray()
  categories?: string[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  playerId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmployeeAddressDto)
  address?: EmployeeAddressDto | null;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  pisNumber?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  voterTitle?: string | null;

  @IsString()
  @IsOptional()
  ctpsUrl?: string | null;

  @IsString()
  @IsOptional()
  pixKey?: string | null;

  @IsDateString()
  @IsOptional()
  admissionMedicalExamDate?: string | null;

  @IsString()
  @IsOptional()
  admissionMedicalExamFileUrl?: string | null;

  @IsDateString()
  @IsOptional()
  dismissalMedicalExamDate?: string | null;

  @IsString()
  @IsOptional()
  dismissalMedicalExamFileUrl?: string | null;

  @IsBoolean()
  @IsOptional()
  hasMinorChildren?: boolean;
}
