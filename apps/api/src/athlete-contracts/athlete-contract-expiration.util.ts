const DEFAULT_ALERT_DAYS = [90, 60, 30, 15, 7];

export function resolveAlertDays(config: unknown): number[] {
  if (!config || typeof config !== 'object') return DEFAULT_ALERT_DAYS;
  const days = (config as { expirationAlertDays?: unknown }).expirationAlertDays;
  if (!Array.isArray(days)) return DEFAULT_ALERT_DAYS;
  const parsed = days.map((d) => Number(d)).filter((n) => Number.isFinite(n) && n > 0);
  return parsed.length ? [...new Set(parsed)].sort((a, b) => b - a) : DEFAULT_ALERT_DAYS;
}

export function daysUntilEnd(endDate: Date | null | undefined, reference = new Date()): number | null {
  if (!endDate) return null;
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - ref.getTime()) / (24 * 60 * 60 * 1000));
}

export function computeContractStatusHint(
  status: string,
  endDate: Date | null | undefined,
  reference = new Date(),
): string {
  if (status === 'ACTIVE' || status === 'EXPIRING') {
    const days = daysUntilEnd(endDate, reference);
    if (days == null) return status;
    if (days < 0) return 'EXPIRED';
    if (days <= 30) return 'EXPIRING';
  }
  return status;
}

export function matchesExpirationWindow(
  endDate: Date | null | undefined,
  windowDays: number | undefined,
  reference = new Date(),
): boolean {
  if (windowDays == null || !endDate) return false;
  const days = daysUntilEnd(endDate, reference);
  if (days == null) return false;
  return days >= 0 && days <= windowDays;
}
