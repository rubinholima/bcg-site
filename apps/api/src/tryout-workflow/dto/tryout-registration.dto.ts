import { IsIn, IsOptional, IsString } from 'class-validator';
import {
  TRYOUT_FEDERATION_STATUSES,
  TRYOUT_REG_STATUSES,
} from '../tryout-workflow.constants';

export class UpdateTryoutRegistrationDto {
  @IsOptional()
  @IsIn([...TRYOUT_REG_STATUSES])
  tryoutRegDocumentation?: string;

  @IsOptional()
  @IsIn([...TRYOUT_REG_STATUSES])
  tryoutRegCbf?: string;

  @IsOptional()
  @IsIn([...TRYOUT_FEDERATION_STATUSES])
  tryoutRegFederation?: string;

  @IsOptional()
  @IsIn([...TRYOUT_REG_STATUSES])
  tryoutRegBid?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
