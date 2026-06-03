export const BEATSCODE_AGENDA_EXPORT_VERSION = 1 as const;

export type BeatscodeAgendaScheduleExportItem = {
  categoryKey: string;
  beatscodeCategoryId: number;
  beatscodeCategoryName: string;
  item: Record<string, unknown>;
};

export type BeatscodeAgendaCompetitionExportItem = {
  categoryKey: string;
  beatscodeCategoryId: number;
  beatscodeCategoryName: string;
  item: Record<string, unknown>;
};

export type BeatscodeAgendaExportFile = {
  version: typeof BEATSCODE_AGENDA_EXPORT_VERSION;
  exportedAt: string;
  apiUrl: string;
  tenantSlug: string;
  categoriesProcessed: string[];
  scheduleItems: BeatscodeAgendaScheduleExportItem[];
  competitions: BeatscodeAgendaCompetitionExportItem[];
  errors: string[];
};

export function isBeatscodeAgendaExportFile(raw: unknown): raw is BeatscodeAgendaExportFile {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return (
    o.version === BEATSCODE_AGENDA_EXPORT_VERSION &&
    Array.isArray(o.scheduleItems) &&
    typeof o.tenantSlug === 'string'
  );
}
