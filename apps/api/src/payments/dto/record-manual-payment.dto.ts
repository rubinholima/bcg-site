import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PAYMENT_METHODS } from '../payment-core.constants';

export class RecordManualPaymentDto {
  @IsString()
  @IsIn([...PAYMENT_METHODS])
  paymentMethod: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  manualReference?: string;

  @IsOptional()
  @IsString()
  manualNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalProviderLabel?: string;
}
