import { IsIn, IsOptional, IsString } from 'class-validator';
import { TRYOUT_REFERRAL_SOURCES } from '../tryout-workflow.constants';

export class TryoutArrivalDto {
  @IsIn([...TRYOUT_REFERRAL_SOURCES])
  arrivalReferralSource!: string;

  @IsOptional()
  @IsString()
  sourceDetails?: string;
}
