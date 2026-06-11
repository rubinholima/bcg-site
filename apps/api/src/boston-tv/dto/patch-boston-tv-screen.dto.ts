import { IsOptional, IsString, MinLength } from 'class-validator';

export class PatchBostonTvScreenDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  locationHint?: string | null;

  @IsOptional()
  @IsString()
  playlistId?: string | null;

  /** playlist | iptv */
  @IsOptional()
  @IsString()
  displayMode?: string;

  @IsOptional()
  @IsString()
  iptvChannelId?: string | null;

  /** follow_hall | independent */
  @IsOptional()
  @IsString()
  hallSyncMode?: string;

  @IsOptional()
  @IsString()
  scheduleTimezone?: string;

  @IsOptional()
  weeklySchedule?: unknown;
}
