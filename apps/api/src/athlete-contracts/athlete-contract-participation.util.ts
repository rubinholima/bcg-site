/** Tipos em que a soma das percentagens deve fechar em 100%. */
export const PARTICIPATION_TYPES_REQUIRING_100 = new Set(['economic_rights', 'ownership_split']);

export function validateParticipationPercentages(
  items: Array<{ participationType: string; percentage?: number | string | null }>,
): { ok: true } | { ok: false; message: string } {
  const byType = new Map<string, number>();
  for (const item of items) {
    const t = item.participationType?.trim() || 'other';
    if (!PARTICIPATION_TYPES_REQUIRING_100.has(t)) continue;
    const p = Number(item.percentage ?? 0);
    if (!Number.isFinite(p)) {
      return { ok: false, message: `Percentual inválido em ${t}.` };
    }
    byType.set(t, (byType.get(t) ?? 0) + p);
  }
  for (const [type, total] of byType) {
    if (Math.abs(total - 100) > 0.01) {
      return {
        ok: false,
        message: `Participação ${type} deve totalizar 100% (atual: ${total.toFixed(2)}%).`,
      };
    }
  }
  return { ok: true };
}
