import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PAYMENT_PROVIDER_ENVIRONMENTS } from '../payment-core.constants';

export class CreatePaymentProviderAccountDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MaxLength(64)
  providerKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @IsOptional()
  @IsString()
  @IsIn([...PAYMENT_PROVIDER_ENVIRONMENTS])
  environment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledCurrencies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledMethods?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  merchantAccountId?: string;

  /** JSON string — cifrado no servidor; nunca retornado. */
  @IsOptional()
  @IsString()
  credentialsJson?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;
}
