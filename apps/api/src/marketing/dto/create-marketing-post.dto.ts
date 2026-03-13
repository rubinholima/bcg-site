import { IsString, IsOptional, IsArray, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMarketingPostDto {
  @IsOptional()
  @IsString()
  tenantId?: string | null;

  @IsOptional()
  @IsString()
  title?: string | null;

  @IsString()
  content: string;

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
