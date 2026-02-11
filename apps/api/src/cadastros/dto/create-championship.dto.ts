import { IsString, MaxLength } from 'class-validator';

export class CreateChampionshipDto {
  @IsString()
  @MaxLength(255)
  name: string;
}
