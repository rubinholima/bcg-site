import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { HEALTH_INTERN_AREAS } from './create-health-intern.dto';

export class UpdateHealthInternDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(HEALTH_INTERN_AREAS)
  area?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  registry?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  supervisorId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
