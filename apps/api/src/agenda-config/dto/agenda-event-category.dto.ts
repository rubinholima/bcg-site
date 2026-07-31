import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateAgendaEventCategoryDto {
  @IsString()
  slug!: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  areaSlug?: string | null;

  @IsOptional()
  @IsString()
  eventType?: string | null;

  @IsOptional()
  @IsString()
  matchSide?: string | null;

  @IsString()
  bgColor!: string;

  @IsString()
  textColor!: string;

  @IsString()
  borderColor!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateAgendaEventCategoryDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  areaSlug?: string | null;

  @IsOptional()
  @IsString()
  eventType?: string | null;

  @IsOptional()
  @IsString()
  matchSide?: string | null;

  @IsOptional()
  @IsString()
  bgColor?: string;

  @IsOptional()
  @IsString()
  textColor?: string;

  @IsOptional()
  @IsString()
  borderColor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
