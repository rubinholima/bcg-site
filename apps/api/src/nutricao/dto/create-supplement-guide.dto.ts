import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateSupplementGuideDto {
  @IsString()
  tenantId: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  playerId?: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  whenToTake?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
