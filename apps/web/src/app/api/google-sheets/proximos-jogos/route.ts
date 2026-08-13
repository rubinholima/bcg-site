import { NextRequest, NextResponse } from "next/server";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import type { ProximosJogosFixtureItem } from "@/types/home-content";

/** Extrai ID da planilha de uma URL do Google Sheets ou retorna o próprio valor se já for um ID. */
function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

/** Detecta URL "Publicar na Web" e retorna a URL de export CSV. Inclui gid da aba quando informado. */
function getPublishedExportUrl(input: string, gid?: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/e\/(2PACX-[a-zA-Z0-9_-]+)/i);
  if (!match) return null;
  const effectiveGid = gid?.trim() || extractGidFromUrl(trimmed) || "0";
  return `https://docs.google.com/spreadsheets/d/e/${match[1]}/pub?output=csv&gid=${effectiveGid}`;
}

/** Extrai gid da aba a partir da URL. */
function extractGidFromUrl(input: string): string | null {
  const trimmed = input.trim();
  const fromQuery = trimmed.match(/[?&]gid=(\d+)/i);
  if (fromQuery) return fromQuery[1];
  const fromHash = trimmed.match(/#gid=(\d+)/i);
  if (fromHash) return fromHash[1];
  return null;
}

/** Parse simples de CSV: suporta campos entre aspas. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      row.push(field.trim());
      field = "";
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim());
      field = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      continue;
    }
    field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }
  return rows;
}

/** Normaliza nome de coluna para comparação. */
function normCol(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Converte data (YYYY-MM-DD) + hora (HH:MM ou HH:MM:SS) em startISO (Brasília). */
function toStartISO(dateStr: string, timeStr: string): string {
  const d = (dateStr ?? "").trim();
  const t = (timeStr ?? "20:00").trim();
  if (!d) return "";
  const hhmm = t ? (t.length <= 5 ? t : t.slice(0, 5)) : "20:00";
  const date = new Date(`${d}T${hhmm}:00-03:00`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** Normaliza categoria para valor do sistema (principal, sub20, etc.). */
function normalizeCategory(value: string): string {
  const v = value?.trim().toLowerCase() ?? "";
  if (!v) return "principal";
  const found = FIXTURE_CATEGORIES.find(
    (c) =>
      c.value === v ||
      c.labelPT.toLowerCase() === v ||
      c.labelEN.toLowerCase() === v ||
      v.includes(c.value)
  );
  return found ? found.value : v;
}

/** Destaque: sim, s, 1, true, x → true; não, n, 0, false → false. */
function normalizeFeatured(value: string): boolean {
  const v = value?.trim().toLowerCase() ?? "";
  if (v === "não" || v === "nao" || v === "n" || v === "0" || v === "false") return false;
  return v === "sim" || v === "s" || v === "1" || v === "true" || v === "x";
}

/** Nosso time: casa, home, mandante → true; visitante, away, fora → false. */
function normalizeIsOurTeamHome(value: string): boolean | undefined {
  const v = value?.trim().toLowerCase() ?? "";
  if (!v) return undefined;
  if (v === "casa" || v === "home" || v === "mandante" || v === "m") return true;
  if (v === "visitante" || v === "away" || v === "fora" || v === "v") return false;
  return undefined;
}

/** Extrai valor da coluna de filtro (clube ou evento). Mesmo valor que o parâmetro `slug` na importação. */
function getRowSlug(record: Record<string, string>): string {
  const keys = [
    "clube_slug",
    "clube/slug",
    "evento_slug",
    "evento/slug",
    "event_slug",
    "clube",
    "slug",
  ];
  for (const k of keys) {
    const v = record[k]?.trim();
    if (v) return v.toLowerCase();
  }
  return "";
}

/** Verifica se a linha pertence ao slug. Se a planilha não tem coluna clube/slug, inclui a linha. */
function rowMatchesSlug(record: Record<string, string>, slug: string | null): boolean {
  if (!slug?.trim()) return true;
  const rowSlug = getRowSlug(record);
  if (!rowSlug) return true; // planilha antiga sem coluna: incluir
  return rowSlug === slug.trim().toLowerCase();
}

/** Converte uma linha CSV em ProximosJogosFixtureItem (com campos usados no editor manual). */
function rowToFixture(headers: string[], row: string[]): ProximosJogosFixtureItem & { id?: string; isOurTeamHome?: boolean; homeTeamLogoUrl?: string; awayTeamLogoUrl?: string } {
  const record: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    record[normCol(headers[i])] = row[i]?.trim() ?? "";
  }
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = record[normCol(k)];
      if (v !== undefined && v !== "") return v;
    }
    return "";
  };
  const data = get("data", "date", "data_jogo");
  const hora = get("hora", "time", "horario");
  const startISO = toStartISO(data, hora) || (get("data_hora", "startISO", "iso") || "");
  const homeTeamName = get("time_casa", "home_team", "homeTeamName", "casa", "mandante");
  const awayTeamName = get("time_visitante", "away_team", "awayTeamName", "visitante");
  const category = normalizeCategory(get("categoria", "category"));
  const featured = normalizeFeatured(get("destaque", "featured", "destaque"));
  const isOurTeamHome = normalizeIsOurTeamHome(get("nosso_time", "our_team", "posicao"));
  return {
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    startISO,
    status: "SCHEDULED",
    competitionName: get("competicao", "competition", "competitionName") || undefined,
    venueName: get("local", "venue", "venueName") || undefined,
    homeTeamName: homeTeamName || "Casa",
    awayTeamName: awayTeamName || "Visitante",
    watchUrl: get("url_assistir", "watch_url", "watchUrl") || undefined,
    ticketUrl: get("url_ingresso", "ticket_url", "ticketUrl") || undefined,
    featured: featured || undefined,
    category,
    isOurTeamHome,
    homeTeamLogoUrl: get("logo_casa", "home_logo", "homeTeamLogoUrl") || undefined,
    awayTeamLogoUrl: get("logo_visitante", "away_logo", "awayTeamLogoUrl") || undefined,
  };
}

/**
 * GET /api/google-sheets/proximos-jogos?spreadsheetId=...&gid=0&slug=...
 * Planilha: "Qualquer pessoa com o link pode ver" ou link Publicar na Web.
 * Primeira linha = cabeçalho. Colunas: data, hora, time_casa, time_visitante, competicao, local, etc.
 * Filtro opcional `slug`: a linha deve ter o mesmo valor na coluna clube/slug, evento/slug, slug, etc.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const spreadsheetInput = (searchParams.get("spreadsheetId") ?? searchParams.get("url") ?? "").trim();
  const gid = searchParams.get("gid") ?? "0";
  const slug = searchParams.get("slug")?.trim() || null;

  const decodedInput = spreadsheetInput
    ? (() => {
        try {
          return decodeURIComponent(spreadsheetInput);
        } catch {
          return spreadsheetInput;
        }
      })()
    : "";

  const publishedExportUrl = getPublishedExportUrl(decodedInput, gid);

  if (publishedExportUrl) {
    const res = await fetch(publishedExportUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0",
        Accept: "text/csv,text/plain,*/*",
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Link "Publicado na Web" inacessível (HTTP ${res.status}). Confira se ainda está publicado.` },
        { status: 502 }
      );
    }
    const text = await res.text();
    if ((res.headers.get("content-type") ?? "").toLowerCase().includes("text/html") || text.trimStart().startsWith("<!")) {
      return NextResponse.json(
        { error: "O link publicado retornou HTML em vez de CSV. Republique (Arquivo > Compartilhar > Publicar na Web) e use o link gerado." },
        { status: 502 }
      );
    }
    const rows = parseCSV(text);
    const headers = rows[0] ?? [];
    const fixtures: (ProximosJogosFixtureItem & { isOurTeamHome?: boolean; homeTeamLogoUrl?: string; awayTeamLogoUrl?: string })[] = [];
    for (let r = 1; r < rows.length; r++) {
      const record: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        record[normCol(headers[i])] = rows[r][i]?.trim() ?? "";
      }
      if (!rowMatchesSlug(record, slug)) continue;
      const fixture = rowToFixture(headers, rows[r]);
      if (!fixture.startISO && !fixture.homeTeamName && !fixture.awayTeamName) continue;
      if (!fixture.startISO) fixture.startISO = new Date().toISOString();
      fixtures.push(fixture);
    }
    return NextResponse.json({ fixtures });
  }

  const spreadsheetId = extractSpreadsheetId(decodedInput);
  if (!spreadsheetId) {
    return NextResponse.json(
      {
        error:
          "URL ou ID inválido. Use: (1) URL normal da planilha (docs.google.com/spreadsheets/d/...), (2) ID da planilha (~44 caracteres), ou (3) Link 'Publicado na Web'.",
      },
      { status: 400 }
    );
  }

  const effectiveGid = (gid && gid !== "0") ? gid : (extractGidFromUrl(decodedInput) ?? "0");
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${effectiveGid}`;
  let res: Response;
  try {
    res = await fetch(exportUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0",
        Accept: "text/csv,text/plain,*/*",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível acessar a planilha. Verifique se está compartilhada como 'Qualquer pessoa com o link pode ver'." },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const statusHint =
      res.status === 403
        ? " (403 – acesso negado). Confira: Compartilhar > Qualquer pessoa com o link pode ver; ou use Publicar na Web."
        : res.status === 404
          ? " (404 – planilha ou aba não encontrada)"
          : ` (HTTP ${res.status})`;
    return NextResponse.json(
      { error: `Planilha inacessível${statusHint}` },
      { status: 502 }
    );
  }

  const text = await res.text();
  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  if (contentType.includes("text/html") || text.trimStart().startsWith("<!")) {
    return NextResponse.json(
      {
        error:
          "A planilha retornou página de login. Compartilhe como 'Qualquer pessoa com o link' pode ver, ou use Publicar na Web.",
      },
      { status: 502 }
    );
  }

  const rows = parseCSV(text);
  const headers = rows[0] ?? [];
  const fixtures: (ProximosJogosFixtureItem & { isOurTeamHome?: boolean; homeTeamLogoUrl?: string; awayTeamLogoUrl?: string })[] = [];
  for (let r = 1; r < rows.length; r++) {
    const record: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      record[normCol(headers[i])] = rows[r][i]?.trim() ?? "";
    }
    if (!rowMatchesSlug(record, slug)) continue;
    const fixture = rowToFixture(headers, rows[r]);
    if (!fixture.startISO && !fixture.homeTeamName && !fixture.awayTeamName) continue;
    if (!fixture.startISO) fixture.startISO = new Date().toISOString();
    fixtures.push(fixture);
  }
  return NextResponse.json({ fixtures });
}
