import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class PresenceHeartbeatDto {
  @IsString()
  @MaxLength(120)
  sessionKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  currentPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentModule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentPageTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tenantLabel?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
