import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreatePlayerGuardianDto {
  @IsString()
  playerId: string;

  @IsString()
  name: string;

  @IsString()
  relationship: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  cpf?: string;

  @IsOptional()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdatePlayerGuardianDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  relationship?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  cpf?: string;

  @IsOptional()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
