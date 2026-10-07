import type { Payment, PaymentAttempt, PaymentProviderAccount, PaymentRefund, Prisma } from '@prisma/client';

function dec(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  return typeof v === 'number' ? v : v.toNumber();
}

export function serializePaymentProviderAccount(row: PaymentProviderAccount) {
  const {
    credentialsEnc: _c,
    credentialsIv: _ci,
    webhookSecretEnc: _w,
    webhookSecretIv: _wi,
    ...safe
  } = row;
  return {
    ...safe,
    credentialsConfigured: !!(_c && _ci),
    webhookSecretConfigured: !!(_w && _wi),
  };
}

export function serializePayment(row: Payment) {
  return {
    ...row,
    amount: dec(row.amount)!,
    paidAmount: dec(row.paidAmount)!,
    refundedAmount: dec(row.refundedAmount)!,
    providerFee: dec(row.providerFee),
  };
}

export function serializePaymentAttempt(row: PaymentAttempt) {
  return {
    ...row,
    amount: dec(row.amount)!,
  };
}

export function serializePaymentRefund(row: PaymentRefund) {
  return {
    ...row,
    amount: dec(row.amount)!,
  };
}
