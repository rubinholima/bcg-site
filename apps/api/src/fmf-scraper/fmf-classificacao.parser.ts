import * as cheerio from 'cheerio';

export type FmfParsedStandingsRow = {
  time: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsMarcados: number;
  golsSofridos: number;
  saldoGols: number;
  competicao?: string;
  categoria?: string;
  temporada?: string;
};

export type FmfParsedStandingsPhase = {
  phaseLabel: string;
  rows: FmfParsedStandingsRow[];
};

function parseIntCell(text: string): number {
  const t = text.replace(/\s+/g, ' ').trim();
  const m = t.match(/-?\d+/);
  return m ? parseInt(m[0]!, 10) : 0;
}

function parseStandingsTableHtml(
  tableHtml: string,
  meta: { competicao: string; categoria: string; temporada: string },
): FmfParsedStandingsRow[] {
  const $ = cheerio.load(tableHtml);
  const rows: FmfParsedStandingsRow[] = [];

  $('tr').each((_, tr) => {
    const $tr = $(tr);
    if ($tr.find('td[colspan]').length) return;

    const cells = $tr
      .find('td')
      .toArray()
      .map((td) => $(td).text().replace(/\s+/g, ' ').trim());
    if (cells.length < 11) return;

    const pos = parseIntCell(cells[0] ?? '');
    if (pos < 1) return;

    const fromTd = $tr.find('td[align="left"]').first().text().replace(/\s+/g, ' ').trim();
    const time = fromTd || $tr.find('img').attr('alt')?.trim() || '';
    if (!time) return;

    rows.push({
      time,
      pontos: parseIntCell(cells[3] ?? ''),
      jogos: parseIntCell(cells[4] ?? ''),
      vitorias: parseIntCell(cells[5] ?? ''),
      empates: parseIntCell(cells[6] ?? ''),
      derrotas: parseIntCell(cells[7] ?? ''),
      golsMarcados: parseIntCell(cells[8] ?? ''),
      golsSofridos: parseIntCell(cells[9] ?? ''),
      saldoGols: parseIntCell(cells[10] ?? ''),
      competicao: meta.competicao,
      categoria: meta.categoria,
      temporada: meta.temporada,
    });
  });

  return rows;
}

/**
 * Tabelas oficiais por fase (abas `#cfase_*` em Classificação).
 * Ex.: CLASSIFICATÓRIA, PENTAGONAL REBAIXAMENTO, DECAGONAL FINAL.
 */
export function parseFmfOfficialStandingsByPhase(
  html: string,
  meta: { competicao: string; categoria: string; temporada: string },
): FmfParsedStandingsPhase[] {
  const $ = cheerio.load(html);
  const phaseById = new Map<string, string>();

  $('a[href^="#cfase"]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').trim().replace(/^#/, '');
    const label = $(el).text().replace(/\s+/g, ' ').trim();
    if (href && label) phaseById.set(href, label);
  });

  if (phaseById.size === 0) return [];

  const phases: FmfParsedStandingsPhase[] = [];
  for (const [id, phaseLabel] of phaseById) {
    const safeId = id.replace(/\\/g, '').replace(/"/g, '');
    const pane = $(`[id="${safeId}"]`);
    if (!pane.length) continue;
    const tableHtml = pane.find('table').first().toString();
    if (!tableHtml) continue;
    const rows = parseStandingsTableHtml(tableHtml, meta);
    if (rows.length > 0) phases.push({ phaseLabel, rows });
  }

  return phases;
}

/** Tabela oficial da FMF (aba Classificação) — imediatamente antes do texto "PG: Pontos Ganhos". */
export function parseFmfOfficialStandingsHtml(
  html: string,
  meta: { competicao: string; categoria: string; temporada: string },
): FmfParsedStandingsRow[] {
  const byPhase = parseFmfOfficialStandingsByPhase(html, meta);
  if (byPhase.length > 0) {
    // Fallback legado: primeira fase do HTML (geralmente Classificatória).
    return byPhase[0]!.rows;
  }

  const marker = /<small>\s*PG:\s*Pontos Ganhos/i;
  const match = marker.exec(html);
  if (!match || match.index == null) return [];

  const before = html.slice(0, match.index);
  const tableStart = before.lastIndexOf('<table');
  if (tableStart < 0) return [];

  const tableHtml = before.slice(tableStart) + '</table>';
  return parseStandingsTableHtml(tableHtml, meta);
}
