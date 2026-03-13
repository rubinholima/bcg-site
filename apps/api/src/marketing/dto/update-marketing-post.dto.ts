import { IsString, IsOptional, IsArray, IsDateString } from 'class-validator';

export class UpdateMarketingPostDto {
  @IsOptional()
  @IsString()
  tenantId?: string | null;

  @IsOptional()
  @IsString()
  title?: string | null;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  platforms?: string[];

  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
