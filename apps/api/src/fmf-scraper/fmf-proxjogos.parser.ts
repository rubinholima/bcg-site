import * as cheerio from 'cheerio';

const MONTHS = new Map<string, number>([
  ['janeiro', 0],
  ['fevereiro', 1],
  ['marco', 2],
  ['abril', 3],
  ['maio', 4],
  ['junho', 5],
  ['julho', 6],
  ['agosto', 7],
  ['setembro', 8],
  ['outubro', 9],
  ['novembro', 10],
  ['dezembro', 11],
]);

function normalizeMonthToken(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Ex.: "Quinta, 6 de maio de 2026" */
export function parseMatchDateFromHeader(textRaw: string): string | null {
  const text = textRaw.replace(/^[^,]+,\s*/i, '').trim();
  const m = text.match(/(\d{1,2})\s+de\s+(\S+)\s+de\s+(\d{4})/i);
  if (!m) return null;
  const day = parseInt(m[1]!, 10);
  const monthKey = normalizeMonthToken(m[2]!);
  const month = MONTHS.get(monthKey);
  if (month == null) return null;
  const year = parseInt(m[3]!, 10);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeTime(t: string): string | null {
  const s = t.replace(/\s/g, '');
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = String(Math.min(23, parseInt(m[1]!, 10))).padStart(2, '0');
  return `${h}:${m[2]}:00`;
}

function parseScoreFromTds(tds: string[]) {
  if (tds.length === 1 && tds[0]!.toUpperCase() === 'X') {
    return { home: null as number | null, away: null as number | null, scheduled: true };
  }
  if (tds.length === 3 && tds[1]!.toUpperCase() === 'X') {
    const a = tds[0]!;
    const b = tds[2]!;
    if (a === '' || b === '') return { home: null, away: null, scheduled: true };
    const h = parseInt(a, 10);
    const aw = parseInt(b, 10);
    if (Number.isNaN(h) || Number.isNaN(aw)) return { home: null, away: null, scheduled: true };
    return { home: h, away: aw, scheduled: false };
  }
  return { home: null, away: null, scheduled: true };
}

function absoluteEscudoUrl(src: string | undefined | null): string | null {
  if (!src?.trim()) return null;
  const t = src.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('//')) return `http:${t}`;
  if (t.startsWith('/')) return `http://esumula.fmf.com.br${t}`;
  return `http://esumula.fmf.com.br/escudos/${t.replace(/^escudos\//i, '')}`;
}

export type FmfParsedMatch = {
  /** Ex.: CLASSIFICATÓRIA, QUARTAS, SEMIFINAIS, OCTOGONAL */
  phaseLabel: string | null;
  roundNumber: number | null;
  matchDate: string | null;
  kickoffTime: string | null;
  homeName: string;
  awayName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: 'scheduled' | 'finished';
  fmfJogoNumber: number | null;
  venueText: string | null;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  /** PDF oficial da súmula no SGE/FMF, quando publicado. */
  reportUrl: string | null;
  /** ID interno do jogo extraído do nome do PDF da súmula. */
  externalMatchId: string | null;
};

/** Fase de pontos / grupos — usada na tabela; mata-mata fica de fora. */
export function isFmfGroupStagePhase(phaseLabel: string | null | undefined): boolean {
  if (!phaseLabel?.trim()) return true;
  const p = phaseLabel
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (/QUARTA|SEMI|FINAL|OITAVA|DISPUTA\s+DE\s+3|TERCEIRO\s+LUGAR|MATA|ELIMIN/.test(p)) {
    return false;
  }
  return true;
}

function buildPhaseLabelMap($: cheerio.CheerioAPI): Map<string, string> {
  const map = new Map<string, string>();
  $('a[href^="#fase"], a[data-toggle="tab"][href^="#"]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').trim();
    const id = href.replace(/^#/, '');
    if (!id) return;
    const label = $(el).text().replace(/\s+/g, ' ').trim();
    if (label) map.set(id, label);
  });
  return map;
}

function phaseForBox(
  $: cheerio.CheerioAPI,
  box: any,
  phaseById: Map<string, string>,
): string | null {
  const pane = $(box).closest('.tab-pane, [id^="fase_"]');
  if (!pane.length) return null;
  const id = (pane.attr('id') ?? '').trim();
  if (!id) return null;
  return phaseById.get(id) ?? null;
}

function extractMatchFromRow(
  $: cheerio.CheerioAPI,
  row: any,
  ctx: {
    phaseLabel: string | null;
    roundNumber: number | null;
    currentDate: string | null;
  },
): FmfParsedMatch | null {
  const $row = $(row);
  if ($row.find('div.col-md-12 b').first().length) return null;

  const timeRaw = $row.find('div.col-md-1').first().text().trim();
  if (!/^\d{1,2}:\d{2}$/.test(timeRaw)) return null;

  const innerRow = $row.find('div.col-md-11 div.row').first();
  if (!innerRow.length) return null;

  const homeName = innerRow.find('div.col-md-3[align="right"]').first().text().trim();
  const awayName = innerRow.find('div.col-md-3[align="left"]').first().text().trim();
  if (!homeName || !awayName) return null;

  const logoImgs = innerRow
    .find('img[src*="escudos"]')
    .toArray()
    .map((img) => absoluteEscudoUrl($(img).attr('src')))
    .filter((u): u is string => Boolean(u));

  const tds = innerRow
    .find('div.col-md-6 table tr td')
    .toArray()
    .map((td) => $(td).text().trim());
  const { home: homeGoals, away: awayGoals, scheduled } = parseScoreFromTds(tds);

  const sideNote = $row.find('div.col-md-3').filter((_, el) => /Jogo\s+\d+/i.test($(el).text()));
  let venueText: string | null = null;
  let fmfJogo: number | null = null;
  if (sideNote.length) {
    const block = sideNote.first().text().replace(/\s+/g, ' ').trim();
    const jm = block.match(/Jogo\s+(\d+)/i);
    if (jm) fmfJogo = parseInt(jm[1]!, 10);
    venueText = block.replace(/^Jogo\s+\d+\s*/i, '').trim() || null;
  }

  const rawReportUrl = (
    $row.find('a[href*="/sumulas/"], a[href*="\\\\sumulas\\\\"]').first().attr('href') ?? ''
  )
    .trim()
    .replace(/\\/g, '/');
  const reportUrl = rawReportUrl || null;
  const externalMatchId =
    reportUrl?.match(/Sumula_Jogo_(\d+)_/i)?.[1] ?? null;

  return {
    phaseLabel: ctx.phaseLabel,
    roundNumber: ctx.roundNumber,
    matchDate: ctx.currentDate,
    kickoffTime: normalizeTime(timeRaw),
    homeName,
    awayName,
    homeGoals,
    awayGoals,
    status: scheduled ? 'scheduled' : 'finished',
    fmfJogoNumber: fmfJogo,
    venueText,
    homeLogoUrl: logoImgs[0] ?? null,
    awayLogoUrl: logoImgs[1] ?? null,
    reportUrl,
    externalMatchId,
  };
}

/** Extrai partidas do HTML ProxJogos (todas as abas/fases: classificatória, quartas, etc.). */
export function parseFmfProxJogosHtml(html: string): FmfParsedMatch[] {
  const $ = cheerio.load(html);
  const out: FmfParsedMatch[] = [];
  const phaseById = buildPhaseLabelMap($);

  let roundNumber: number | null = null;
  let currentDate: string | null = null;
  let lastPaneId: string | null = null;

  $('div.box.box-solid').each((_, box) => {
    const pane = $(box).closest('.tab-pane, [id^="fase_"]');
    const paneId = pane.length ? (pane.attr('id') ?? '').trim() || null : null;
    // Nova aba/fase: reinicia rodada/data (HTML da FMF reinicia o contexto por pane)
    if (paneId !== lastPaneId) {
      lastPaneId = paneId;
      roundNumber = null;
      currentDate = null;
    }

    const phaseLabel = phaseForBox($, box, phaseById);
    const title = $(box).find('h3.box-title_es').first().text().trim();
    const rm = title.match(/RODADA\s+(\d+)/i);
    if (rm) roundNumber = parseInt(rm[1]!, 10);

    $(box)
      .find('div.box-body div.row')
      .each((__, row) => {
        const bold = $(row).find('div.col-md-12 b').first();
        if (bold.length) {
          const d = parseMatchDateFromHeader(bold.text().trim());
          if (d) currentDate = d;
          return;
        }

        const parsed = extractMatchFromRow($, row, {
          phaseLabel,
          roundNumber,
          currentDate,
        });
        if (parsed) out.push(parsed);
      });
  });

  const best = new Map<string, FmfParsedMatch>();
  const stableKey = (m: FmfParsedMatch) =>
    `${m.phaseLabel ?? ''}|${m.roundNumber ?? ''}|${m.matchDate ?? ''}|${m.kickoffTime ?? ''}|${m.homeName}|${m.awayName}`;

  function scoreRow(m: FmfParsedMatch): number {
    let s = 0;
    if (m.fmfJogoNumber != null) s += 4;
    if (m.venueText) s += 2;
    if (m.kickoffTime) s += 1;
    if (m.homeLogoUrl) s += 1;
    if (m.awayLogoUrl) s += 1;
    if (m.phaseLabel) s += 1;
    if (m.status === 'finished' && m.homeGoals != null && m.awayGoals != null) s += 1;
    return s;
  }

  for (const m of out) {
    const k = stableKey(m);
    const prev = best.get(k);
    if (!prev || scoreRow(m) > scoreRow(prev)) best.set(k, m);
  }

  return [...best.values()];
}
