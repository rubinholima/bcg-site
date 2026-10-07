/** Status canônicos do Payment Core — independentes de gateway. */
export const PAYMENT_STATUSES = [
  'pending',
  'processing',
  'authorized',
  'paid',
  'failed',
  'cancelled',
  'expired',
  'partially_refunded',
  'refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  'pix',
  'credit_card',
  'debit_card',
  'boleto',
  'bank_transfer',
  'cash',
  'check',
  'other',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_ATTEMPT_STATUSES = [
  'pending',
  'processing',
  'authorized',
  'captured',
  'failed',
  'cancelled',
  'expired',
] as const;

export const PAYMENT_REFUND_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const;

export const PAYMENT_WEBHOOK_PROCESSING_STATUSES = ['pending', 'processing', 'processed', 'failed', 'ignored'] as const;

export const PAYMENT_PROVIDER_ENVIRONMENTS = ['sandbox', 'production'] as const;

/** Escopo de idempotência na criação de Payment (tenant + key). */
export const PAYMENT_CREATE_IDEMPOTENCY_SCOPE = 'payment_create';
