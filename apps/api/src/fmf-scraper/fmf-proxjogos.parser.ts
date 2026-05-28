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

export type FmfParsedMatch = {
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
};

/** Extrai partidas do HTML ProxJogos (portado do SOCCER SOLUTION). */
export function parseFmfProxJogosHtml(html: string): FmfParsedMatch[] {
  const $ = cheerio.load(html);
  const out: FmfParsedMatch[] = [];
  let roundNumber: number | null = null;
  let currentDate: string | null = null;

  $('div.box.box-solid').each((_, box) => {
    const title = $(box).find('h3.box-title_es').first().text().trim();
    const rm = title.match(/RODADA\s+(\d+)/i);
    if (rm) roundNumber = parseInt(rm[1]!, 10);

    $(box)
      .find('div.box-body div.row')
      .each((_, row) => {
        const $row = $(row);
        const bold = $row.find('div.col-md-12 b').first();
        if (bold.length) {
          const d = parseMatchDateFromHeader(bold.text().trim());
          if (d) currentDate = d;
          return;
        }

        const timeRaw = $row.find('div.col-md-1').first().text().trim();
        if (!/^\d{1,2}:\d{2}$/.test(timeRaw)) return;

        const innerRow = $row.find('div.col-md-11 div.row').first();
        if (!innerRow.length) return;

        const homeName = innerRow.find('div.col-md-3[align="right"]').first().text().trim();
        const awayName = innerRow.find('div.col-md-3[align="left"]').first().text().trim();
        if (!homeName || !awayName) return;

        const tds = innerRow
          .find('div.col-md-6 table tr td')
          .toArray()
          .map((td) => $(td).text().trim());
        const { home: homeGoals, away: awayGoals, scheduled } = parseScoreFromTds(tds);

        const sideNote = $row.find('div.col-md-3').filter((_, el) => {
          const t = $(el).text();
          return /Jogo\s+\d+/i.test(t);
        });
        let venueText: string | null = null;
        let fmfJogo: number | null = null;
        if (sideNote.length) {
          const block = sideNote.first().text().replace(/\s+/g, ' ').trim();
          const jm = block.match(/Jogo\s+(\d+)/i);
          if (jm) fmfJogo = parseInt(jm[1]!, 10);
          venueText = block.replace(/^Jogo\s+\d+\s*/i, '').trim() || null;
        }

        out.push({
          roundNumber,
          matchDate: currentDate,
          kickoffTime: normalizeTime(timeRaw),
          homeName,
          awayName,
          homeGoals,
          awayGoals,
          status: scheduled ? 'scheduled' : 'finished',
          fmfJogoNumber: fmfJogo,
          venueText,
        });
      });
  });

  const best = new Map<string, FmfParsedMatch>();
  const stableKey = (m: FmfParsedMatch) =>
    `${m.roundNumber ?? ''}|${m.matchDate ?? ''}|${m.homeName}|${m.awayName}`;

  function scoreRow(m: FmfParsedMatch): number {
    let s = 0;
    if (m.fmfJogoNumber != null) s += 4;
    if (m.venueText) s += 2;
    if (m.kickoffTime) s += 1;
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
