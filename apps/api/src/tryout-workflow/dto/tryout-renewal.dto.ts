import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class TryoutRenewPeriodDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class TryoutEarlyApprovalDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  skipToCoach?: boolean;
}
