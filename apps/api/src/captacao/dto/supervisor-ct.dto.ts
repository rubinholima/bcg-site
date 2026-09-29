import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class SupervisorCtDto {
  @IsIn(['confirm', 'reschedule'])
  action!: 'confirm' | 'reschedule';

  @IsOptional()
  @IsISO8601()
  ctScheduledAt?: string;

  @IsOptional()
  @IsString()
  ctRoom?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
