import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBostonTvScreenDto {
  @IsString()
  @MinLength(1)
  tenantId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  locationHint?: string;

  /** UUID da playlist inicial (opcional) */
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

  @IsOptional()
  @IsString()
  scheduleTimezone?: string;

  /** JSON: [{ weekdays:[1-7], start:"HH:mm", end:"HH:mm" }] */
  @IsOptional()
  weeklySchedule?: unknown;
}
