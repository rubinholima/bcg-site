import { IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class GeneratePasswordDto {
  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(128)
  length?: number = 24;

  @IsOptional()
  @IsBoolean()
  upper?: boolean = true;

  @IsOptional()
  @IsBoolean()
  lower?: boolean = true;

  @IsOptional()
  @IsBoolean()
  number?: boolean = true;

  @IsOptional()
  @IsBoolean()
  symbol?: boolean = true;

  @IsOptional()
  @IsBoolean()
  avoidAmbiguous?: boolean = true;
}
