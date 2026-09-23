import * as cheerio from 'cheerio';
import { toOperationalCategory } from './fmf-operational-category.util';
import { fmfProxJogosUrl, inferCategoryFromCompetitionLabel } from './fmf-scraper.presets';

export const FMF_COMPETITION_CATALOG_KEY = 'fmf_competition_catalog';

export type FmfCompetitionCatalogEntry = {
  fmfD: number;
  /** Rótulo curto do menu FMF (ex.: "2ª Divisão"). */
  navLabel: string;
  /** Contexto de categoria quando inferível (ex.: "Sub 17"). */
  categoryHint: string | null;
  url: string;
};

export type FmfCompetitionCatalog = {
  updatedAt: string;
  sourceUrl: string;
  entries: FmfCompetitionCatalogEntry[];
};

const SUB_HINT_RE = /\bSUB\s*[- ]?\s*(\d{1,2})\b/i;

function normalizeLabel(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Extrai entradas ProxJogos?d=N do HTML (menu lateral / links de competição). */
export function parseFmfCompetitionCatalogFromHtml(
  html: string,
  sourceUrl: string,
): FmfCompetitionCatalogEntry[] {
  const $ = cheerio.load(html);
  const byD = new Map<number, FmfCompetitionCatalogEntry>();
  let currentCategoryHint: string | null = null;

  $('a[href*="ProxJogos.aspx?d="]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const m = href.match(/[?&]d=(\d+)/i);
    if (!m) return;
    const fmfD = Number.parseInt(m[1]!, 10);
    if (!Number.isFinite(fmfD)) return;

    const navLabel = normalizeLabel($(el).text());
    if (!navLabel) return;

    let parentText = normalizeLabel($(el).parent().prev('a, span, strong, b').first().text());
    let subInParent = parentText.match(SUB_HINT_RE);
    if (!subInParent) {
      const ancestors = $(el).parents().slice(0, 6);
      ancestors.each((_, anc) => {
        if (subInParent) return false;
        const t = normalizeLabel($(anc).find('> a, > span, > strong, > b').first().text());
        subInParent = t.match(SUB_HINT_RE);
        if (subInParent) parentText = t;
      });
    }
    if (subInParent) {
      currentCategoryHint = `Sub ${subInParent[1]}`;
    } else if (/^SUB\s/i.test(navLabel)) {
      const sub = navLabel.match(SUB_HINT_RE);
      currentCategoryHint = sub ? `Sub ${sub[1]}` : currentCategoryHint;
    }

    const categoryHint =
      currentCategoryHint ??
      (SUB_HINT_RE.test(navLabel)
        ? `Sub ${navLabel.match(SUB_HINT_RE)![1]}`
        : /M[ÓO]DULO\s*II/i.test(navLabel)
          ? 'Módulo II'
          : null);

    const prev = byD.get(fmfD);
    const entry: FmfCompetitionCatalogEntry = {
      fmfD,
      navLabel,
      categoryHint,
      url: fmfProxJogosUrl(fmfD),
    };
    if (!prev || navLabel.length >= prev.navLabel.length) {
      byD.set(fmfD, entry);
    }
  });

  return [...byD.values()].sort((a, b) => a.fmfD - b.fmfD);
}

export function buildFmfCompetitionCatalog(
  html: string,
  sourceUrl: string,
): FmfCompetitionCatalog {
  return {
    updatedAt: new Date().toISOString(),
    sourceUrl,
    entries: parseFmfCompetitionCatalogFromHtml(html, sourceUrl),
  };
}

export function parseStoredFmfCompetitionCatalog(raw: unknown): FmfCompetitionCatalog | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (!Array.isArray(row.entries)) return null;
  const entries: FmfCompetitionCatalogEntry[] = [];
  for (const item of row.entries) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const e = item as Record<string, unknown>;
    const fmfD = typeof e.fmfD === 'number' ? e.fmfD : Number.parseInt(String(e.fmfD ?? ''), 10);
    if (!Number.isFinite(fmfD)) continue;
    entries.push({
      fmfD,
      navLabel: typeof e.navLabel === 'string' ? e.navLabel : String(fmfD),
      categoryHint: typeof e.categoryHint === 'string' ? e.categoryHint : null,
      url: typeof e.url === 'string' ? e.url : fmfProxJogosUrl(fmfD),
    });
  }
  return {
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
    sourceUrl: typeof row.sourceUrl === 'string' ? row.sourceUrl : '',
    entries,
  };
}

export function isFmfCatalogStale(
  catalog: FmfCompetitionCatalog | null,
  maxAgeMs = 7 * 24 * 60 * 60 * 1000,
): boolean {
  if (!catalog?.updatedAt) return true;
  const t = Date.parse(catalog.updatedAt);
  if (Number.isNaN(t)) return true;
  return Date.now() - t > maxAgeMs;
}

/** Categoria operacional do elenco inferida do catálogo FMF (Sub 17 → sub17). */
export function inferOperationalCategoryFromCatalogEntry(
  entry: FmfCompetitionCatalogEntry,
): string | null {
  if (entry.categoryHint) {
    const fromHint = inferCategoryFromCompetitionLabel(entry.categoryHint);
    if (fromHint) return fromHint;
  }
  const fromNav = inferCategoryFromCompetitionLabel(entry.navLabel);
  if (fromNav) return fromNav;
  if (/M[ÓO]DULO\s*II/i.test(entry.navLabel)) return 'modulo_ii';
  return null;
}

export function catalogEntryMatchesOperationalCategory(
  entry: FmfCompetitionCatalogEntry,
  operationalCategory: string,
): boolean {
  const op = inferOperationalCategoryFromCatalogEntry(entry);
  const wanted = operationalCategory.trim().toLowerCase();
  return op != null && op === wanted;
}

/** Rótulo oficial da página ProxJogos (súmula/header) → categoria operacional. */
export function inferOperationalCategoryFromProbedHtml(html: string): string | null {
  const label = extractOfficialCompetitionLabelFromHtml(html);
  if (!label) return null;
  const raw = inferCategoryFromCompetitionLabel(label);
  return raw ? toOperationalCategory(raw) : null;
}

/** Extrai rótulo oficial da competição no HTML ProxJogos. */
export function extractOfficialCompetitionLabelFromHtml(html: string): string | null {
  const inconf = html.match(
    /COPA\s+INCONFID[EÊ]NCIA\s*-\s*SUB\s*\d+\s*-\s*\d{4}/i,
  );
  if (inconf) return inconf[0].replace(/\s+/g, ' ').trim();
  const m = html.match(/SUB\s*\d+\s*-\s*2\s*[ªA]?\s*DIVIS[AÃ]O\s*-\s*\d{4}/i);
  if (m) return m[0].replace(/\s+/g, ' ').trim();
  const m2 = html.match(/M[ÓO]DULO\s*II\s*-\s*\d{4}/i);
  if (m2) return m2[0].replace(/\s+/g, ' ').trim();
  const m3 = html.match(/SUB\s*\d+\s*-\s*2\s*[ªA]?\s*DIVIS[AÃ]O\s*\d{4}/i);
  if (m3) return m3[0].replace(/\s+/g, ' ').trim();
  const m4 = html.match(/SUB\s*\d+\s*-\s*1\s*[ªA]?\s*DIVIS[AÃ]O\s*-\s*\d{4}/i);
  if (m4) return m4[0].replace(/\s+/g, ' ').trim();
  return null;
}
