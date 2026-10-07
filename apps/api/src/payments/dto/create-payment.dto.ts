import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PAYMENT_METHODS } from '../payment-core.constants';

export class CreatePaymentDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MaxLength(128)
  idempotencyKey: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @MaxLength(3)
  currency: string;

  @ValidateIf((o) => !o.venueReceivableInstallmentId)
  @IsString()
  eventTicketOrderId?: string;

  @ValidateIf((o) => !o.eventTicketOrderId)
  @IsString()
  venueReceivableInstallmentId?: string;

  @IsOptional()
  @IsString()
  @IsIn([...PAYMENT_METHODS])
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  paymentProviderAccountId?: string;
}
