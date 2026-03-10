import { IsString, IsOptional, IsArray, MaxLength, IsDateString } from 'class-validator';

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
}
