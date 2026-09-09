import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  message?: string;

  @IsOptional()
  @IsIn(['info', 'warning', 'success', 'danger'])
  type?: 'info' | 'warning' | 'success' | 'danger';

  @IsOptional()
  @IsIn(['all', 'user'])
  targetMode?: 'all' | 'user';

  @IsOptional()
  @IsString()
  targetUserId?: string | null;

  @IsOptional()
  @IsBoolean()
  dismissible?: boolean;

  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string | null;
}
