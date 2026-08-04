import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateLogisticsClothingCategoryDto {
  @IsString()
  name!: string;

  @IsString()
  groupId!: string;

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

export class UpdateLogisticsClothingCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

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
