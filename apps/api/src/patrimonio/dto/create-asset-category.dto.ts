import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

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
  @IsIn(['general', 'uniform'])
  kind?: 'general' | 'uniform';
}
