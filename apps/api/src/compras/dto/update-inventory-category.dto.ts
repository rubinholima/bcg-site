import { IsString, IsOptional, MaxLength, IsInt, Min } from 'class-validator';

export class UpdateInventoryCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
