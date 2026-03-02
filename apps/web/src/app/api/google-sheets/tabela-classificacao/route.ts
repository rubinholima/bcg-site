import { NextRequest, NextResponse } from "next/server";
import type { TabelaStandingsRow } from "@/types/home-content";

export const dynamic = "force-dynamic";

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

function getVal(record: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = record[normCol(k)];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

/** Extrai valor da coluna clube/slug da linha. Colunas: clube/slug, clube_slug, clube, slug. */
function getRowSlug(record: Record<string, string>): string {
  const keys = ["clube_slug", "clube/slug", "clube", "slug"];
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
  if (!rowSlug) return true;
  return rowSlug === slug.trim().toLowerCase();
}

function toNum(v: string): number {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
}

const AGE_GROUP_VALUES = ["principal", "sub20", "sub17", "sub15", "sub13", "sub11", "sub9", "feminino"];

/** Converte uma linha CSV em TabelaStandingsRow. Posição e variação são calculados pelo app. */
function rowToStandings(record: Record<string, string>): TabelaStandingsRow | null {
  const competicaoRaw = getVal(record, "competicao", "categorias", "competition");
  const categoriaRaw = getVal(record, "categoria", "category", "grupo");
  const isAgeGroup = AGE_GROUP_VALUES.includes((categoriaRaw ?? "").trim().toLowerCase());
  const competicao = (competicaoRaw ?? "").trim() || (!isAgeGroup && categoriaRaw?.trim() ? categoriaRaw.trim() : "");
  const categoria = isAgeGroup ? categoriaRaw.trim() : (categoriaRaw?.trim() || "");

  const time = getVal(record, "time", "team", "nome");
  if (!time?.trim()) return null;
  if (!competicao?.trim() && !categoria?.trim()) return null;

  const pontos = toNum(getVal(record, "pontos", "points", "p"));
  const jogos = toNum(getVal(record, "jogos", "matches", "mp", "j"));
  const vitorias = toNum(getVal(record, "vitorias", "wins", "w"));
  const empates = toNum(getVal(record, "empates", "draws", "d", "e"));
  const derrotas = toNum(getVal(record, "derrotas", "losses", "l"));
  const golsMarcados = toNum(getVal(record, "gols_marcados", "gf", "goals_for"));
  const golsSofridos = toNum(getVal(record, "gols_sofridos", "ga", "goals_against"));
  const saldoGols = golsMarcados - golsSofridos;

  return {
    competicao: competicao || undefined,
    categoria: categoria || undefined,
    temporada: getVal(record, "temporada", "season", "temporada")?.trim() || undefined,
    time: time.trim(),
    logoTime: getVal(record, "logo_time", "logo", "logo_time")?.trim() || undefined,
    pontos,
    jogos,
    vitorias,
    empates,
    derrotas,
    golsMarcados,
    golsSofridos,
    saldoGols,
    ultimosJogos: getVal(record, "ultimos_jogos", "form", "ultimos_jogos")?.trim() || undefined,
    proximoJogo: getVal(record, "proximo_jogo", "next", "next_match")?.trim() || undefined,
    logoProximo: getVal(record, "logo_proximo", "logo_next", "logo_adversario")?.trim() || undefined,
  };
}

/**
 * GET /api/google-sheets/tabela-classificacao?spreadsheetId=...&gid=0
 * Planilha: "Qualquer pessoa com o link pode ver" ou link Publicar na Web.
 * Primeira linha = cabeçalho. Colunas: categoria, temporada, posicao, variacao, time, logo_time, pontos, jogos, etc.
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
    const standings: TabelaStandingsRow[] = [];
    for (let r = 1; r < rows.length; r++) {
      const record: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        record[normCol(headers[i])] = rows[r][i]?.trim() ?? "";
      }
      if (!rowMatchesSlug(record, slug)) continue;
      const row = rowToStandings(record);
      if (row) standings.push(row);
    }
    return NextResponse.json({ rows: standings });
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
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${effectiveGid}&t=${Date.now()}`;
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
  const standings: TabelaStandingsRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const record: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      record[normCol(headers[i])] = rows[r][i]?.trim() ?? "";
    }
    if (!rowMatchesSlug(record, slug)) continue;
    const row = rowToStandings(record);
    if (row) standings.push(row);
  }
  return NextResponse.json({ rows: standings });
}
