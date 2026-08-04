import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateLogisticsUniformTypeDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  beatscodeId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateLogisticsUniformTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  beatscodeId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
