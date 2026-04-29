import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class PatchBostonTvPlaylistItemDto {
  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  url?: string;

  @IsOptional()
  @IsInt()
  durationSeconds?: number | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
