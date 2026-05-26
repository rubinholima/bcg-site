import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  @MaxLength(512)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  document?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  phone?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
