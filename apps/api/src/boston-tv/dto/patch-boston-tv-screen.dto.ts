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

  @IsOptional()
  @IsString()
  scheduleTimezone?: string;

  @IsOptional()
  weeklySchedule?: unknown;
}
