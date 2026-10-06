import { BadRequestException, ForbiddenException } from '@nestjs/common';

export function canAccessAnalysisMaterialInDossier(
  moduleSlugs: readonly string[],
  role: string | null | undefined,
): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  if (normalized === 'super_admin' || normalized === 'company_admin') return true;
  return moduleSlugs.includes('futebol_analise_desempenho');
}

export function parseAnalysisMaterialIdsRaw(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return dedupeMaterialIds(ids);
}

export function dedupeMaterialIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function parseAnalysisMaterialIdsBody(raw: unknown): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw new BadRequestException('analysisMaterial deve ser uma lista de IDs de material.');
  }
  const ids: string[] = [];
  for (const item of raw) {
    const id = String(item ?? '').trim();
    if (id) ids.push(id);
  }
  return dedupeMaterialIds(ids);
}

export function assertAnalysisMaterialAccess(
  moduleSlugs: readonly string[],
  role: string,
  hasSelection: boolean,
): void {
  if (!hasSelection) return;
  if (!canAccessAnalysisMaterialInDossier(moduleSlugs, role)) {
    throw new ForbiddenException(
      'Você não tem permissão para incluir material de análise de desempenho no dossiê.',
    );
  }
}

export function formatMatchClock(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
