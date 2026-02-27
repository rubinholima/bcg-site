import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateChampionshipDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  logoUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(512)
  standingsFormula?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  standingsFormulaName?: string;
}
