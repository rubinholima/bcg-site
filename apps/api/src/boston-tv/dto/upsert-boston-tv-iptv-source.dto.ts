import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertBostonTvIptvSourceDto {
  @IsString()
  @MinLength(1)
  tenantId!: string;

  @IsString()
  @MinLength(8)
  playlistUrl!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
