import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export const HEALTH_INTERN_AREAS = [
  'medicina',
  'psicologia',
  'fisioterapia',
  'enfermagem',
  'nutricao',
  'fisiologia',
  'massagem',
  'outro',
] as const;

export type HealthInternArea = (typeof HEALTH_INTERN_AREAS)[number];

export class CreateHealthInternDto {
  @IsString()
  name!: string;

  @IsString()
  @IsIn(HEALTH_INTERN_AREAS)
  area!: string;

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
  supervisorId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
