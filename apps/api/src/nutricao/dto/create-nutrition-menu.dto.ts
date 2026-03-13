import { IsString, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class CreateNutritionMenuDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  dayContext?: string; // treino | jogo | folga

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validTo?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
