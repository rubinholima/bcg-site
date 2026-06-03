import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateFixtureCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  labelPT?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  labelEN?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
