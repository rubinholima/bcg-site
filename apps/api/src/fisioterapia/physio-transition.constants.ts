export const PHYSIO_TRANSITION_WORK_TYPES = [
  'integrado_fisiologia_preparacao',
  'campo',
  'ginasio',
  'piscina',
  'outro',
] as const;

export const PHYSIO_TRANSITION_WORK_TYPE_LABEL: Record<
  (typeof PHYSIO_TRANSITION_WORK_TYPES)[number],
  string
> = {
  integrado_fisiologia_preparacao: 'Integrado (fisiologia + preparação + fisio)',
  campo: 'Campo',
  ginasio: 'Ginásio',
  piscina: 'Piscina',
  outro: 'Outro',
};

export function computeDurationMinutes(startTime: string, endTime: string): number {
  const start = startTime.trim().match(/^(\d{1,2}):(\d{2})$/);
  const end = endTime.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!start || !end) return 0;
  const startMin = Number(start[1]) * 60 + Number(start[2]);
  const endMin = Number(end[1]) * 60 + Number(end[2]);
  if (endMin <= startMin) return 0;
  return endMin - startMin;
}

export function formatDurationMinutes(total: number): string {
  if (total <= 0) return '—';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
