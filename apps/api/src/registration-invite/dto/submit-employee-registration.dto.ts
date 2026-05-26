import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator';
import { SubmittedDocumentsMixin } from './submitted-document.dto';

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
  pixKey?: string;
}
