import { IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBostonTvPlaylistItemDto {
  @IsString()
  @IsIn(['image_url', 'video_url', 'youtube_video', 'iptv_stream'])
  contentType!: string;

  @IsString()
  @MinLength(1)
  url!: string;

  @IsOptional()
  @IsInt()
  durationSeconds?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
