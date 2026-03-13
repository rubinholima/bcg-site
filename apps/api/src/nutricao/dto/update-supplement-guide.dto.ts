import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateSupplementGuideDto {
  @IsString()
  @IsOptional()
  categoryId?: string | null;

  @IsString()
  @IsOptional()
  playerId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  whenToTake?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
