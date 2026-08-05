import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateTechnicalStaffDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  photoUrl: string;

  @IsString()
  jobRoleId: string;

  @IsOptional()
  @IsArray()
  categories?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(16)
  birthDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  nationality?: string;

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
  @MaxLength(32)
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  licenseType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  licenseNumber?: string;

  @IsOptional()
  @IsDateString()
  licenseValidUntil?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  contractType?: string;

  @IsOptional()
  @IsDateString()
  contractStart?: string;

  @IsOptional()
  @IsDateString()
  contractEnd?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
