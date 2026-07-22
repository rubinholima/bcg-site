import { IsString, IsOptional, MaxLength, IsInt, Min } from 'class-validator';

export class CreateInventoryCategoryDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  slug?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
