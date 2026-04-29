import { IsOptional, IsString, MinLength } from 'class-validator';

export class PatchBostonTvPlaylistDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
