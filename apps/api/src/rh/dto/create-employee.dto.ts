import { IsString, IsOptional, IsArray, MaxLength, IsDateString, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmployeeAddressDto } from './employee-address.dto';

export class CreateEmployeeDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MaxLength(255)
  name: string;

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
  @MaxLength(32)
  type: string; // staff | athlete | dirigente | temporario | estagio

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
  @MaxLength(32)
  playerId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmployeeAddressDto)
  address?: EmployeeAddressDto;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  pisNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  voterTitle?: string;

  @IsString()
  @IsOptional()
  ctpsUrl?: string;

  @IsString()
  @IsOptional()
  pixKey?: string;

  @IsDateString()
  @IsOptional()
  admissionMedicalExamDate?: string;

  @IsString()
  @IsOptional()
  admissionMedicalExamFileUrl?: string;

  @IsDateString()
  @IsOptional()
  dismissalMedicalExamDate?: string;

  @IsString()
  @IsOptional()
  dismissalMedicalExamFileUrl?: string;

  @IsBoolean()
  @IsOptional()
  hasMinorChildren?: boolean;
}
