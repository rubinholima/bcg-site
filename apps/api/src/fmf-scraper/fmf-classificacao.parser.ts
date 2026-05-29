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

function parseIntCell(text: string): number {
  const t = text.replace(/\s+/g, ' ').trim();
  const m = t.match(/-?\d+/);
  return m ? parseInt(m[0]!, 10) : 0;
}

/** Tabela oficial da FMF (aba Classificação) — imediatamente antes do texto "PG: Pontos Ganhos". */
export function parseFmfOfficialStandingsHtml(
  html: string,
  meta: { competicao: string; categoria: string; temporada: string },
): FmfParsedStandingsRow[] {
  const marker = /<small>\s*PG:\s*Pontos Ganhos/i;
  const match = marker.exec(html);
  if (!match || match.index == null) return [];

  const before = html.slice(0, match.index);
  const tableStart = before.lastIndexOf('<table');
  if (tableStart < 0) return [];

  const tableHtml = before.slice(tableStart) + '</table>';
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
