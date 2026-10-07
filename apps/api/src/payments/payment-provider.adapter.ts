import type { PaymentMethod } from './payment-core.constants';

/** Contrato futuro para adapters de gateway — sem implementação nesta etapa. */
export type ProviderCreatePaymentInput = {
  tenantId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type ProviderPaymentSnapshot = {
  providerPaymentId: string;
  status: string;
  reference?: string;
  metadata?: Record<string, unknown>;
};

export type ProviderRefundInput = {
  providerPaymentId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  reason?: string;
};

export type ProviderWebhookParseResult = {
  providerEventId: string;
  eventType: string;
  metadata: Record<string, unknown>;
};

export interface PaymentProviderAdapter {
  readonly providerKey: string;

  createPayment(input: ProviderCreatePaymentInput): Promise<ProviderPaymentSnapshot>;

  getPayment(providerPaymentId: string): Promise<ProviderPaymentSnapshot>;

  cancelPayment(providerPaymentId: string): Promise<ProviderPaymentSnapshot>;

  capturePayment(providerPaymentId: string, amount?: number): Promise<ProviderPaymentSnapshot>;

  refundPayment(input: ProviderRefundInput): Promise<{ providerRefundId: string; status: string }>;

  parseAndVerifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): Promise<ProviderWebhookParseResult>;
}
