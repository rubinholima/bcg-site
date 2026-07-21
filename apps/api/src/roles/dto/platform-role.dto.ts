import { IsBoolean, IsInt, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreatePlatformRoleDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{1,48}$/, {
    message: 'Slug inválido — minúsculas, números e underscore',
  })
  slug: string;

  @IsString()
  @MinLength(2)
  label: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  canAccessDashboard?: boolean;

  @IsOptional()
  @IsBoolean()
  includeInMatrix?: boolean;
}

export class UpdatePlatformRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  canAccessDashboard?: boolean;

  @IsOptional()
  @IsBoolean()
  includeInMatrix?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
