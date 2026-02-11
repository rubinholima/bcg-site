import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateChampionshipDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;
}
