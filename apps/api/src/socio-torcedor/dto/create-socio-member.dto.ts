import { IsString, IsOptional, IsNumber, IsEmail, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSocioMemberDto {
  @IsString()
  tenantId: string;

  @IsString()
  planId: string;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  points?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  loyaltyTier?: number;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: string; // active | suspended | cancelled
}
