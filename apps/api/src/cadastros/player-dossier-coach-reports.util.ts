import { BadRequestException, ForbiddenException } from '@nestjs/common';

export const DOSSIER_COACH_REPORT_KINDS = [
  'coach_player_evaluation',
  'coach_team_report_player',
  'coach_match_rating',
] as const;

export type DossierCoachReportKind = (typeof DOSSIER_COACH_REPORT_KINDS)[number];

export const DOSSIER_COACH_REPORT_LABELS: Record<DossierCoachReportKind, string> = {
  coach_player_evaluation: 'Avaliação Individual',
  coach_team_report_player: 'Relatório da Equipe',
  coach_match_rating: 'Avaliação Pós-Jogo',
};

export type CoachReportSelectionToken = {
  kind: DossierCoachReportKind;
  id: string;
};

export function canAccessCoachReportsInDossier(
  moduleSlugs: readonly string[],
  role: string | null | undefined,
): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  if (normalized === 'super_admin' || normalized === 'company_admin') return true;
  return moduleSlugs.includes('futebol_treinadores');
}

export function parseCoachReportSelectionsRaw(raw?: string | null): CoachReportSelectionToken[] {
  if (!raw?.trim()) return [];
  const tokens: CoachReportSelectionToken[] = [];
  for (const part of raw.split(',')) {
    const piece = part.trim();
    if (!piece) continue;
    const colon = piece.indexOf(':');
    if (colon <= 0) continue;
    const kind = piece.slice(0, colon).trim().toLowerCase();
    const id = piece.slice(colon + 1).trim();
    if (!id) continue;
    if (!(DOSSIER_COACH_REPORT_KINDS as readonly string[]).includes(kind)) continue;
    tokens.push({ kind: kind as DossierCoachReportKind, id });
  }
  return dedupeCoachReportSelections(tokens);
}

export function dedupeCoachReportSelections(
  tokens: readonly CoachReportSelectionToken[],
): CoachReportSelectionToken[] {
  const seen = new Set<string>();
  const out: CoachReportSelectionToken[] = [];
  for (const t of tokens) {
    const key = `${t.kind}:${t.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function assertCoachReportAccess(
  moduleSlugs: readonly string[],
  role: string,
  hasSelection: boolean,
): void {
  if (!hasSelection) return;
  if (!canAccessCoachReportsInDossier(moduleSlugs, role)) {
    throw new ForbiddenException(
      'Você não tem permissão para incluir relatórios de treinadores no dossiê.',
    );
  }
}

export function coachReportSelectionKey(kind: DossierCoachReportKind, id: string): string {
  return `${kind}:${id}`;
}

export function encodeCoachReportSelections(tokens: readonly CoachReportSelectionToken[]): string {
  return tokens.map((t) => `${t.kind}:${t.id}`).join(',');
}

export function parseCoachReportSelectionsBody(
  raw: unknown,
): CoachReportSelectionToken[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw new BadRequestException('coachReports deve ser uma lista de { kind, id }.');
  }
  const tokens: CoachReportSelectionToken[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const kind = String((item as { kind?: unknown }).kind ?? '')
      .trim()
      .toLowerCase();
    const id = String((item as { id?: unknown }).id ?? '').trim();
    if (!id || !(DOSSIER_COACH_REPORT_KINDS as readonly string[]).includes(kind)) continue;
    tokens.push({ kind: kind as DossierCoachReportKind, id });
  }
  return dedupeCoachReportSelections(tokens);
}
