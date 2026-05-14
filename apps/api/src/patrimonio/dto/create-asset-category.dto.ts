import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';
import { ASSET_CATEGORY_KINDS } from '../asset-category-kinds';

export class CreateAssetCategoryDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  code?: string;

  @IsString()
  @IsOptional()
  @IsIn([...ASSET_CATEGORY_KINDS])
  kind?: string;
}
