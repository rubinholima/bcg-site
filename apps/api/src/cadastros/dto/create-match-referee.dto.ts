import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMatchRefereeDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  federation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
