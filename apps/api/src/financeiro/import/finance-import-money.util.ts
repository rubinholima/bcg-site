import { Prisma } from '@prisma/client';
import { moneyDecimal, moneyToNumber } from '../finance-money.util';

const BRL_RE = /-?\s*R\$\s*([\d.,]+)/i;

function parseLocaleMoneyNumber(fragment: string): number {
  const s = fragment.trim();
  if (!s) return NaN;
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf('.') > s.lastIndexOf(',')) {
      return Number(s.replace(/,/g, ''));
    }
    return Number(s.replace(/\./g, '').replace(',', '.'));
  }
  if (s.includes(',')) {
    return Number(s.replace(/\./g, '').replace(',', '.'));
  }
  return Number(s.replace(/\./g, ''));
}

export function parseSpreadsheetMoney(v: unknown): {
  amount: Prisma.Decimal | null;
  direction: 'out' | 'in' | 'unknown';
  raw: string | null;
} {
  if (v == null || v === '') {
    return { amount: null, direction: 'unknown', raw: null };
  }
  if (v instanceof Prisma.Decimal) {
    const n = moneyToNumber(v);
    return { amount: moneyDecimal(Math.abs(n)), direction: n < 0 ? 'out' : n > 0 ? 'in' : 'unknown', raw: String(v) };
  }
  if (typeof v === 'number') {
    const abs = Math.abs(v);
    return {
      amount: moneyDecimal(abs),
      direction: v < 0 ? 'out' : v > 0 ? 'in' : 'unknown',
      raw: String(v),
    };
  }
  const raw = String(v).trim();
  if (!raw || /^n\/d$/i.test(raw)) {
    return { amount: null, direction: 'unknown', raw: raw || null };
  }
  let negative = raw.startsWith('-') || raw.includes('-R$');
  const m = raw.match(BRL_RE);
  if (m) {
    negative = negative || raw.includes('-R$');
    const num = parseLocaleMoneyNumber(m[1]);
    const parsed = num;
    if (!Number.isFinite(parsed)) return { amount: null, direction: 'unknown', raw };
    return {
      amount: moneyDecimal(parsed),
      direction: negative ? 'out' : 'in',
      raw,
    };
  }
  const n = parseLocaleMoneyNumber(raw.replace(/[^\d,.-]/g, ''));
  if (!Number.isFinite(n)) return { amount: null, direction: 'unknown', raw };
  return {
    amount: moneyDecimal(Math.abs(n)),
    direction: n < 0 ? 'out' : n > 0 ? 'in' : 'unknown',
    raw,
  };
}

export function moneyEquationDelta(parts: {
  original: Prisma.Decimal | null;
  interest: Prisma.Decimal | null;
  penalty: Prisma.Decimal | null;
  discount: Prisma.Decimal | null;
  abatement: Prisma.Decimal | null;
  accrual: Prisma.Decimal | null;
  paid: Prisma.Decimal | null;
}): number | null {
  if (parts.original == null || parts.paid == null) return null;
  const expected = parts.original
    .add(parts.interest ?? 0)
    .add(parts.penalty ?? 0)
    .add(parts.accrual ?? 0)
    .sub(parts.discount ?? 0)
    .sub(parts.abatement ?? 0);
  return moneyToNumber(parts.paid.sub(expected));
}
