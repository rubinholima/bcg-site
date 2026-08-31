import { BadRequestException } from '@nestjs/common';
import type { CompensationKind } from './employment-compensation.constants';

export type DatedAmountItem = {
  kind?: string;
  amount: unknown;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
};

export type SalaryRevisionRow = {
  amount: unknown;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
};

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function decimalToNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const n = Number(String(value));
  return Number.isFinite(n) ? n : 0;
}

export function isEffectiveAtDate(
  effectiveFrom: Date,
  effectiveTo: Date | null | undefined,
  date: Date,
): boolean {
  const day = startOfDay(date);
  const from = startOfDay(effectiveFrom);
  if (from > day) return false;
  if (!effectiveTo) return true;
  return startOfDay(effectiveTo) >= day;
}

export function periodsOverlap(
  aFrom: Date,
  aTo: Date | null | undefined,
  bFrom: Date,
  bTo: Date | null | undefined,
): boolean {
  const aStart = startOfDay(aFrom).getTime();
  const aEnd = aTo ? startOfDay(aTo).getTime() : Infinity;
  const bStart = startOfDay(bFrom).getTime();
  const bEnd = bTo ? startOfDay(bTo).getTime() : Infinity;
  return aStart <= bEnd && bStart <= aEnd;
}

export function pickCompensationAtDate<T extends DatedAmountItem>(
  items: T[],
  kind: CompensationKind,
  date: Date,
): T | null {
  const matching = items
    .filter((item) => item.kind === kind && isEffectiveAtDate(item.effectiveFrom, item.effectiveTo, date))
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  return matching[0] ?? null;
}

export function receivesCompensationAtDate<T extends DatedAmountItem>(
  items: T[],
  kind: CompensationKind,
  date: Date,
): boolean {
  const item = pickCompensationAtDate(items, kind, date);
  return item != null && decimalToNumber(item.amount) > 0;
}

export function compensationAmountAtDate<T extends DatedAmountItem>(
  items: T[],
  kind: CompensationKind,
  date: Date,
): number | null {
  const item = pickCompensationAtDate(items, kind, date);
  if (!item) return null;
  const amount = decimalToNumber(item.amount);
  return amount > 0 ? amount : null;
}

export function assertNoOverlapSameKind(
  items: DatedAmountItem[],
  kind: CompensationKind,
  effectiveFrom: Date,
  effectiveTo: Date | null | undefined,
  excludeId?: string,
): void {
  for (const item of items) {
    if (item.kind !== kind) continue;
    if (excludeId && 'id' in item && (item as { id: string }).id === excludeId) continue;
    if (periodsOverlap(item.effectiveFrom, item.effectiveTo, effectiveFrom, effectiveTo)) {
      throw new BadRequestException(
        'Já existe um registro com período sobreposto para este tipo de benefício.',
      );
    }
  }
}

export function getSalaryAtDate(
  revisions: SalaryRevisionRow[],
  fallbackSalaryBase: number | null | undefined,
  date: Date,
): number | null {
  const active = revisions
    .filter((r) => isEffectiveAtDate(r.effectiveFrom, r.effectiveTo, date))
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  if (active[0]) {
    const amount = decimalToNumber(active[0].amount);
    return amount > 0 ? amount : null;
  }
  if (fallbackSalaryBase != null && fallbackSalaryBase > 0) {
    return fallbackSalaryBase;
  }
  return null;
}

export function getCurrentSalary(
  revisions: SalaryRevisionRow[],
  salaryBase: number | null | undefined,
  asOf: Date = new Date(),
): number | null {
  return getSalaryAtDate(revisions, salaryBase, asOf);
}

export function mergeBankDataJson(
  existing: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (value === null || value === '') {
      delete base[key];
    } else {
      base[key] = value;
    }
  }
  return base;
}

export function normalizeHolderCpf(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}
