import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateLogisticsClothingGroupDto {
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

export class UpdateLogisticsClothingGroupDto {
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
