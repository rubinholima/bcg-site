import type { FootballAgendaEntryType } from '../futebol-agenda/futebol-agenda.constants';
import type { BeatscodeAgendaScheduleExportItem } from './beatscode-agenda-export.types';

export type MappedBeatscodeAgendaEntry = {
  externalId: string;
  category: string;
  type: FootballAgendaEntryType;
  title: string;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
  status: 'confirmado' | 'provisorio' | 'cancelado';
  beatscodeMeta: Record<string, unknown>;
  linkedPlayerExternalIds: string[];
};

export type MappedBeatscodeTravel = {
  externalId: string;
  category: string;
  matchDate: Date;
  isHomeMatch: boolean;
  opponentName: string | null;
  stadiumName: string | null;
  city: string | null;
  country: string | null;
  championshipName: string | null;
  status: string;
  notes: string | null;
  beatscodeMeta: Record<string, unknown>;
  linkedPlayerExternalIds: string[];
};

export type MappedBeatscodeAgendaRow = {
  entry: MappedBeatscodeAgendaEntry;
  travel: MappedBeatscodeTravel | null;
};

/** DD/MM/YYYY HH:mm:ss em America/Sao_Paulo (offset fixo -03:00). */
export function parseBeatscodeDateTime(value: unknown, tzSuffix = '-03:00'): Date | null {
  if (!value || typeof value !== 'string') return null;
  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh = '00', min = '00', ss = '00'] = m;
  const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}${tzSuffix}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function stripHtml(html: unknown): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function resolveAgendaType(row: Record<string, unknown>): FootballAgendaEntryType {
  const rowType = String(row.type ?? '').toLowerCase();
  if (rowType === 'match') return 'jogo';
  if (rowType === 'birthdate') return 'aniversario';
  if (rowType === 'contract') return 'compromisso';
  if (rowType === 'travel') return 'preparacao';

  const scheduleTypeName = String(
    (row.scheduleType as { name?: string } | undefined)?.name ?? '',
  ).toLowerCase();
  if (scheduleTypeName === 'birthdate') return 'aniversario';

  const title = String(row.title ?? '').toLowerCase();
  if (/anivers|birthday|nascimento/.test(title)) return 'aniversario';
  if (/treino|academia|campo|fisioterapia|muscula/.test(title)) return 'treino';
  if (/reuni/.test(title)) return 'reuniao';
  if (/análise|analise|prepara|advers/.test(title)) return 'preparacao';
  if (/jogo|partida|amistoso/.test(title)) return 'jogo';
  if (/contrato|vencimento|renova/.test(title)) return 'compromisso';
  return 'compromisso';
}

function formatAgendaTitle(row: Record<string, unknown>, type: FootballAgendaEntryType): string {
  const raw = String(row.title ?? row.name ?? '').trim() || 'Compromisso';
  if (type === 'aniversario') {
    if (/^anivers/i.test(raw)) return raw;
    return `Aniversário — ${raw}`;
  }
  if (type === 'jogo' && row.type === 'match') {
    const dm = row.dataMatch as Record<string, unknown> | undefined;
    const principal = dm?.principalTeam as { name?: string } | undefined;
    const visitor = dm?.visitorTeam as { name?: string } | undefined;
    const p = principal?.name?.trim();
    const v = visitor?.name?.trim();
    if (p && v) return `${p} x ${v}`;
  }
  return raw;
}

function extractLocation(row: Record<string, unknown>): string | null {
  const local = row.local;
  if (typeof local === 'string' && local.trim()) return local.trim();
  if (local && typeof local === 'object') {
    const o = local as Record<string, unknown>;
    const name = String(o.name ?? o.title ?? '').trim();
    const city = String(o.city ?? '').trim();
    if (name && city) return `${name} — ${city}`;
    if (name) return name;
  }
  const dm = row.dataMatch as Record<string, unknown> | undefined;
  const stadium = dm?.stadium as Record<string, unknown> | undefined;
  if (stadium) {
    const name = String(stadium.name ?? '').trim();
    const city = String(stadium.city ?? stadium.uf ?? '').trim();
    if (name && city) return `${name} — ${city}`;
    if (name) return name;
  }
  return null;
}

function extractInvolvedPlayerExternalIds(row: Record<string, unknown>): string[] {
  const involved = row.involved as Record<string, unknown> | undefined;
  const personGroup = involved?.personGroup as Record<string, unknown> | undefined;
  const athletes = personGroup?.athlete;
  if (!Array.isArray(athletes)) return [];
  const ids: string[] = [];
  for (const a of athletes) {
    if (!a || typeof a !== 'object') continue;
    const o = a as Record<string, unknown>;
    const emp = o.employeeId ?? o.idEmployee ?? o.id ?? o.athleteId;
    const n = Number(emp);
    if (Number.isFinite(n) && n > 0) ids.push(`beatscode-${n}`);
  }
  return ids;
}

function scheduleExternalId(categoryKey: string, row: Record<string, unknown>): string | null {
  if (row.type === 'match') {
    const link = row.link as { id?: number } | undefined;
    const matchId = link?.id ?? (row.dataMatch as { id?: number } | undefined)?.id;
    if (matchId != null) return `beatscode-match-${categoryKey}-${matchId}`;
    const date = String(row.initialDate ?? '');
    const title = String(row.title ?? '').slice(0, 40);
    if (date && title) return `beatscode-match-${categoryKey}-${date}-${title}`.replace(/\s+/g, '-');
    return null;
  }
  if (row.type === 'birthdate') {
    const date = String(row.initialDate ?? '');
    const title = String(row.title ?? '').slice(0, 60);
    if (date && title) return `beatscode-birthdate-${categoryKey}-${date}-${title}`.replace(/\s+/g, '-');
    return null;
  }
  const id = row.id;
  if (id != null && String(id) !== 'null') return `beatscode-schedule-${categoryKey}-${id}`;
  const date = String(row.initialDate ?? '');
  const title = String(row.title ?? '').slice(0, 40);
  const rowType = String(row.type ?? 'schedule');
  if (date && title) {
    return `beatscode-${rowType}-${categoryKey}-${date}-${title}`.replace(/\s+/g, '-');
  }
  return null;
}

function isMatchForTravel(row: Record<string, unknown>, dataMatch: Record<string, unknown> | undefined): boolean {
  if (row.isTravel === true) return true;
  if (!dataMatch) return false;
  return true;
}

function mapTravelFromMatch(
  categoryKey: string,
  row: Record<string, unknown>,
  dataMatch: Record<string, unknown>,
): MappedBeatscodeTravel | null {
  if (!isMatchForTravel(row, dataMatch)) return null;
  const link = row.link as { id?: number } | undefined;
  const matchId = link?.id ?? dataMatch.id;
  if (matchId == null) return null;

  const externalId = `beatscode-travel-${categoryKey}-${matchId}`;
  const startAt = parseBeatscodeDateTime(row.initialDate);
  if (!startAt) return null;

  const principal = dataMatch.principalTeam as { name?: string } | undefined;
  const visitor = dataMatch.visitorTeam as { name?: string } | undefined;
  const comp = dataMatch.competition as { name?: string; round?: number; stage?: string } | undefined;
  const stadium = dataMatch.stadium as { name?: string; city?: string; uf?: string } | undefined;

  const ourNames = ['boston city', 'boston city fc', 'bci'];
  const principalName = String(principal?.name ?? '').toLowerCase();
  const isPrincipalUs = ourNames.some((n) => principalName.includes(n));
  const opponentName = isPrincipalUs
    ? String(visitor?.name ?? '').trim() || null
    : String(principal?.name ?? '').trim() || null;

  const championshipParts = [
    comp?.name?.trim(),
    comp?.stage?.trim(),
    comp?.round != null ? `Rodada ${comp.round}` : '',
  ].filter(Boolean);

  return {
    externalId,
    category: categoryKey,
    matchDate: startAt,
    isHomeMatch: isPrincipalUs,
    opponentName,
    stadiumName: stadium?.name?.trim() || null,
    city: stadium?.city?.trim() || stadium?.uf?.trim() || null,
    country: 'Brasil',
    championshipName: championshipParts.join(' — ') || null,
    status: 'planejamento',
    notes: stripHtml(row.observation) || null,
    beatscodeMeta: { row, dataMatch },
    linkedPlayerExternalIds: extractInvolvedPlayerExternalIds(row),
  };
}

export function mapBeatscodeScheduleRow(
  row: Record<string, unknown>,
  categoryKey: string,
): MappedBeatscodeAgendaRow | null {
  if (row.type === 'birthdate') return null;

  const externalId = scheduleExternalId(categoryKey, row);
  if (!externalId) return null;

  const startAt = parseBeatscodeDateTime(row.initialDate);
  if (!startAt) return null;

  const endAt = parseBeatscodeDateTime(row.finalDate);
  const agendaType = resolveAgendaType(row);
  const title = formatAgendaTitle(row, agendaType);
  const observation = stripHtml(row.observation);
  const dataMatch = row.dataMatch as Record<string, unknown> | undefined;

  let description = observation || null;
  if (row.type === 'match' && dataMatch) {
    const comp = dataMatch.competition as { name?: string; local?: string; round?: number } | undefined;
    const parts = [
      comp?.name,
      comp?.local ? `Local: ${comp.local}` : '',
      comp?.round != null ? `Rodada ${comp.round}` : '',
    ].filter(Boolean);
    description = [description, parts.join(' · ')].filter(Boolean).join('\n') || null;
  }

  const entry: MappedBeatscodeAgendaEntry = {
    externalId,
    category: categoryKey,
    type: agendaType,
    title,
    startAt,
    endAt,
    allDay: Boolean(row.allDay ?? row.type === 'birthdate'),
    location: extractLocation(row),
    description,
    status: 'confirmado',
    beatscodeMeta: { ...row },
    linkedPlayerExternalIds: extractInvolvedPlayerExternalIds(row),
  };

  const travel =
    row.type === 'match' && dataMatch ? mapTravelFromMatch(categoryKey, row, dataMatch) : null;

  return { entry, travel };
}

export function dedupeScheduleRows(
  items: BeatscodeAgendaScheduleExportItem[],
): BeatscodeAgendaScheduleExportItem[] {
  const seen = new Set<string>();
  const out: BeatscodeAgendaScheduleExportItem[] = [];
  for (const item of items) {
    const mapped = mapBeatscodeScheduleRow(item.item, item.categoryKey);
    const key = mapped?.entry.externalId ?? JSON.stringify(item.item).slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
