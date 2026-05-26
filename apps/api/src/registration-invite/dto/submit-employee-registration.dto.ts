import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SubmittedDocumentsMixin } from './submitted-document.dto';

export class EmployeeDependentSubmitDto {
  @IsString()
  name: string;

  @IsString()
  birthDate: string;

  @IsOptional()
  @IsString()
  birthCertificateFileUrl?: string;

  @IsOptional()
  @IsString()
  schoolAttendanceFileUrl?: string;

  @IsOptional()
  @IsString()
  vaccinationCardFileUrl?: string;
}

export class SubmitEmployeeRegistrationDto extends SubmittedDocumentsMixin {
  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  pisNumber?: string;

  @IsOptional()
  @IsString()
  voterTitle?: string;

  @IsOptional()
  @IsString()
  ctpsUrl?: string;

  @IsOptional()
  @IsString()
  pixKey?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  admissionMedicalExamDate?: string;

  @IsOptional()
  @IsString()
  admissionMedicalExamFileUrl?: string;

  @IsOptional()
  @IsString()
  dismissalMedicalExamDate?: string;

  @IsOptional()
  @IsString()
  dismissalMedicalExamFileUrl?: string;

  @IsOptional()
  @IsBoolean()
  hasMinorChildren?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeDependentSubmitDto)
  dependents?: EmployeeDependentSubmitDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
