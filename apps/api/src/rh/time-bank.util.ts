import { Prisma } from '@prisma/client';

type MovementRow = {
  movementType: string;
  hours: Prisma.Decimal | number;
};

/** Saldo derivado — nunca editar manualmente. */
export function deriveTimeBankBalanceHours(movements: MovementRow[]): number {
  let balance = 0;
  for (const m of movements) {
    const h = typeof m.hours === 'number' ? m.hours : Number(m.hours);
    if (m.movementType === 'CREDIT' || m.movementType === 'ADJUSTMENT') {
      balance += h;
    } else if (m.movementType === 'DEBIT') {
      balance -= h;
    }
  }
  return Math.round(balance * 10000) / 10000;
}
