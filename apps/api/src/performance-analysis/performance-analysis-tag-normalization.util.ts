import type { PrismaClient } from '@prisma/client';
import { DEFAULT_ANALYSIS_TAGS } from './performance-analysis.constants';

const CANONICAL_BY_KEY = new Map(DEFAULT_ANALYSIS_TAGS.map((t) => [t.key, t]));

const LEGACY_FINALIZATION_OUTCOMES = ['bloqueada', 'fora', 'gol', 'no_gol'].sort().join(',');

function normalizeOutcomesJson(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string');
}

function outcomesKey(outcomes: string[]): string {
  return [...outcomes].sort().join(',');
}

/** Campos operacionais ausentes ou legado — preenche sem sobrescrever customização explícita. */
export function buildCanonicalOperationalPatch(
  existing: {
    key: string;
    label: string;
    outcomes: unknown;
    shortcutKey: string | null;
    requiresPlayer: boolean;
    autoClipEnabled: boolean;
    autoClipPreMs: number;
    autoClipPostMs: number;
  },
  canonical: (typeof DEFAULT_ANALYSIS_TAGS)[number],
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (!existing.shortcutKey?.trim() && canonical.shortcutKey) {
    patch.shortcutKey = canonical.shortcutKey;
  }
  if (canonical.requiresPlayer && !existing.requiresPlayer) {
    patch.requiresPlayer = true;
  }
  if (canonical.autoClipEnabled && !existing.autoClipEnabled) {
    patch.autoClipEnabled = true;
    if (canonical.autoClipPreMs != null) patch.autoClipPreMs = canonical.autoClipPreMs;
    if (canonical.autoClipPostMs != null) patch.autoClipPostMs = canonical.autoClipPostMs;
  }

  const current = normalizeOutcomesJson(existing.outcomes);
  let shouldReplaceOutcomes = current.length === 0;
  if (!shouldReplaceOutcomes && existing.key === 'finalizacao') {
    shouldReplaceOutcomes = outcomesKey(current) === LEGACY_FINALIZATION_OUTCOMES;
  }
  if (
    !shouldReplaceOutcomes &&
    ['passe', 'duelo', 'cruzamento'].includes(existing.key) &&
    current.includes('neutro')
  ) {
    shouldReplaceOutcomes = outcomesKey(current) !== outcomesKey(canonical.outcomes);
  }
  if (
    shouldReplaceOutcomes &&
    canonical.outcomes.length > 0 &&
    outcomesKey(current) !== outcomesKey(canonical.outcomes)
  ) {
    patch.outcomes = canonical.outcomes;
  }

  return patch;
}

export async function normalizeTenantAnalysisTags(
  prisma: Pick<PrismaClient, 'analysisTagDefinition'>,
  tenantId: string,
): Promise<number> {
  const rows = await prisma.analysisTagDefinition.findMany({
    where: { tenantId, key: { in: [...CANONICAL_BY_KEY.keys()] } },
  });
  let updated = 0;
  for (const row of rows) {
    const canonical = CANONICAL_BY_KEY.get(row.key);
    if (!canonical) continue;
    const patch = buildCanonicalOperationalPatch(row, canonical);
    if (Object.keys(patch).length === 0) continue;
    await prisma.analysisTagDefinition.update({
      where: { id: row.id },
      data: patch,
    });
    updated += 1;
  }
  return updated;
}
