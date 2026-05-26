import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SubmittedDocumentsMixin } from './submitted-document.dto';

class PlayerAddressMainDto {
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class PlayerAddressDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PlayerAddressMainDto)
  main?: PlayerAddressMainDto;
}

class PlayerPersonalDto {
  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  @IsString()
  rgIssuer?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  birthPlace?: string;
}

export class SubmitPlayerRegistrationDto extends SubmittedDocumentsMixin {
  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsEmail()
  emergencyContactEmail?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlayerPersonalDto)
  personal?: PlayerPersonalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlayerAddressDto)
  address?: PlayerAddressDto;
}
