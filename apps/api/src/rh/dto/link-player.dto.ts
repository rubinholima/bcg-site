import { IsString } from 'class-validator';

export class LinkPlayerDto {
  @IsString()
  playerId: string;
}
