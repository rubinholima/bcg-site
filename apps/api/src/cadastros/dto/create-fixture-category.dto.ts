import { IsBoolean, IsInt, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateFixtureCategoryDto {
  @IsString()
  @MinLength(1)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'value deve ser slug minúsculo (ex.: sub17, principal)',
  })
  value!: string;

  @IsString()
  @MinLength(1)
  labelPT!: string;

  @IsString()
  @MinLength(1)
  labelEN!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
