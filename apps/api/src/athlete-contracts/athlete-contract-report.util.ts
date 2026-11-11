import { daysUntilEnd, matchesExpirationWindow } from './athlete-contract-expiration.util';

export const ATHLETE_CONTRACT_REPORT_PRESETS = [
  { id: 'expiring_30', label: 'Vencendo em 30 dias', expirationWindowDays: 30 },
  { id: 'expiring_60', label: 'Vencendo em 60 dias', expirationWindowDays: 60 },
  { id: 'expiring_90', label: 'Vencendo em 90 dias', expirationWindowDays: 90 },
  { id: 'expired', label: 'Vencidos', preset: 'expired' },
  { id: 'no_active_contract', label: 'Sem contrato ativo', preset: 'no_active_contract' },
  { id: 'awaiting_signature', label: 'Aguardando assinatura', preset: 'awaiting_signature' },
  { id: 'awaiting_federation', label: 'Aguardando federação', preset: 'awaiting_federation' },
  { id: 'professional', label: 'Profissionais', preset: 'professional' },
  { id: 'formation', label: 'Formação', preset: 'formation' },
  { id: 'agent_intermediary', label: 'Agente/intermediário', preset: 'agent_intermediary' },
  { id: 'partner_club', label: 'Clube parceiro', preset: 'partner_club' },
] as const;

export type ReportPresetId = (typeof ATHLETE_CONTRACT_REPORT_PRESETS)[number]['id'];

export function buildAthleteContractDedupKey(parts: {
  tenantId: string;
  kind: string;
  entityId: string;
  bucket: string;
}): string {
  return `${parts.tenantId}:${parts.kind}:${parts.entityId}:${parts.bucket}`;
}

export function normalizeReportSort(
  sortBy?: string,
  sortDir?: string,
): { sortBy: string; sortDir: 'asc' | 'desc' } {
  const allowed = new Set([
    'endDate',
    'startDate',
    'playerName',
    'category',
    'status',
    'daysUntilExpiry',
    'createdAt',
  ]);
  const by = sortBy && allowed.has(sortBy) ? sortBy : 'endDate';
  const dir = sortDir === 'desc' ? 'desc' : 'asc';
  return { sortBy: by, sortDir: dir };
}

export function applyExpirationPreset(
  preset: string | undefined,
  endDate: Date | null | undefined,
  status: string,
  ref = new Date(),
): boolean {
  if (!preset) return true;
  if (preset === 'expired') {
    const d = daysUntilEnd(endDate, ref);
    return d != null && d < 0;
  }
  if (preset === 'awaiting_signature') return status === 'PENDING_SIGNATURE';
  if (preset.startsWith('expiring_')) {
    const days = Number(preset.replace('expiring_', ''));
    if (Number.isFinite(days)) return matchesExpirationWindow(endDate, days, ref);
  }
  return true;
}

export function categoryLooksProfessional(category: string | null | undefined): boolean {
  if (!category) return false;
  const c = category.toUpperCase();
  return c.includes('PROFISSIONAL') || c === 'PRIMEIRO TIME' || c.includes('SÉNIOR') || c.includes('SENIOR');
}

export function categoryLooksFormation(category: string | null | undefined): boolean {
  if (!category) return false;
  const c = category.toUpperCase();
  return c.includes('SUB-') || c.includes('SUB ') || c.includes('BASE') || c.includes('FORM');
}
