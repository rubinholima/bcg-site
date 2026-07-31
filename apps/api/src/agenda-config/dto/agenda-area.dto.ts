import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateAgendaAreaDto {
  @IsString()
  slug!: string;

  @IsString()
  label!: string;

  @IsString()
  dataSource!: string;

  @IsOptional()
  @IsString()
  moduleSlug?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsString()
  manageHref!: string;

  @IsOptional()
  @IsString()
  createHref?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateAgendaAreaDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  dataSource?: string;

  @IsOptional()
  @IsString()
  moduleSlug?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  manageHref?: string;

  @IsOptional()
  @IsString()
  createHref?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
