import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertBostonTvVmixChannelDto {
  @IsString()
  @MinLength(1)
  tenantId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsIn(['stream', 'ndi'])
  deliveryType?: 'stream' | 'ndi';

  @IsOptional()
  @IsString()
  streamUrl?: string;

  @IsOptional()
  @IsString()
  ndiSourceName?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
