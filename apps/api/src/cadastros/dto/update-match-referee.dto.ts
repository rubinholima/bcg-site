import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateMatchRefereeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(2048)
  photoUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(128)
  federation?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(128)
  licenseNumber?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(64)
  phone?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
