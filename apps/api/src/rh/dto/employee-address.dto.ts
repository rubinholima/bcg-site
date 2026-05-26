import { IsString, IsOptional, MaxLength } from 'class-validator';

export class EmployeeAddressDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  street?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  complement?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  neighborhood?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(8)
  state?: string;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  zipCode?: string;
}
