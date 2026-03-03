import { NextRequest, NextResponse } from "next/server";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import type { TeamCategory } from "@/types/home-content";
import type { PlayerItem, PlayerSocialMedia } from "@/types/home-content";

/** Extrai ID da planilha de uma URL do Google Sheets ou retorna o próprio valor se já for um ID. */
function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Detecta URL "Publicar na Web" (formato /d/e/2PACX-.../pub) e retorna a URL de export CSV.
 * Se não for esse formato, retorna null.
 */
function getPublishedExportUrl(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/e\/(2PACX-[a-zA-Z0-9_-]+)/i);
  if (!match) return null;
  return `https://docs.google.com/spreadsheets/d/e/${match[1]}/pub?output=csv`;
}

/** Extrai gid da aba a partir da URL (query ?gid= ou hash #gid=). */
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

/** Normaliza nome de coluna para comparação (minúsculo, sem acento, underscore). */
function normCol(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Normaliza valor da planilha para preferredFoot (left | right | both). Aceita PT/EN e siglas. */
function normalizePreferredFoot(value: string): "left" | "right" | "both" | undefined {
  const v = value?.trim().toLowerCase();
  if (!v) return undefined;
  if (v === "left" || v === "esquerdo" || v === "e" || v === "esq") return "left";
  if (v === "right" || v === "direito" || v === "d" || v === "dir") return "right";
  if (v === "both" || v === "ambos" || v === "ambidestro" || v === "a" || v === "amb") return "both";
  return undefined;
}

/** Mapeia labels de posição (planilha) para códigos (GK, CB, etc.). Aceita nomes completos em PT. */
const POSITION_LABEL_TO_VALUE: Record<string, string> = {
  goleiro: "GK",
  "zagueiro central": "CB",
  "lateral esquerdo": "LB",
  "lateral direito": "RB",
  "ala esquerdo": "LWB",
  "ala direito": "RWB",
  volante: "CDM",
  "meio-campista": "CM",
  "meia-atacante": "CAM",
  "meia esquerda": "LM",
  "meia direita": "RM",
  "ponta esquerda": "LW",
  "ponta direita": "RW",
  atacante: "CF",
  centroavante: "ST",
};
function normalizePosition(value: string): string {
  const v = value?.trim();
  if (!v) return "";
  const lower = v.toLowerCase();
  return POSITION_LABEL_TO_VALUE[lower] ?? v;
}

/** Índice da coluna clube/slug. -1 se não existir. */
function getSlugColumnIndex(headers: string[]): number {
  const targets = ["clube_slug", "clube/slug", "club_slug", "club/slug"];
  for (let i = 0; i < headers.length; i++) {
    if (targets.includes(normCol(headers[i]))) return i;
  }
  return -1;
}

/** Valor da coluna slug na linha (lowercase). */
function getRowSlug(headers: string[], row: string[], slugColIndex: number): string {
  if (slugColIndex < 0) return "";
  return (row[slugColIndex]?.trim() ?? "").toLowerCase();
}

/** Mapeamento: nome da coluna (normalizado) -> setter no objeto jogador. */
const COLUMN_MAP: Record<
  string,
  (p: PlayerItem, value: string) => void
> = {
  categoria: () => {}, // usado para agrupar, não no jogador
  category: () => {},
  "clube/slug": (p, v) => { p.clubSlug = v?.trim() || undefined; },
  clube_slug: (p, v) => { p.clubSlug = v?.trim() || undefined; },
  "club/slug": (p, v) => { p.clubSlug = v?.trim() || undefined; },
  club_slug: (p, v) => { p.clubSlug = v?.trim() || undefined; },
  nosso_time: () => {},
  nome: (p, v) => { p.name = v || p.name; },
  name: (p, v) => { p.name = v || p.name; },
  foto_url: (p, v) => { p.photoUrl = v || undefined; },
  photo_url: (p, v) => { p.photoUrl = v || undefined; },
  data_nascimento: (p, v) => { p.birthDate = v || undefined; },
  birth_date: (p, v) => { p.birthDate = v || undefined; },
  nascimento: (p, v) => { p.birthDate = v || undefined; },
  nacionalidade: (p, v) => { p.nationality = v || undefined; },
  nationality: (p, v) => { p.nationality = v || undefined; },
  altura: (p, v) => { p.height = v ? parseInt(v, 10) : undefined; },
  height: (p, v) => { p.height = v ? parseInt(v, 10) : undefined; },
  peso: (p, v) => { p.weight = v ? parseInt(v, 10) : undefined; },
  weight: (p, v) => { p.weight = v ? parseInt(v, 10) : undefined; },
  numero_camisa: (p, v) => { p.jerseyNumber = v ? parseInt(v, 10) : undefined; },
  numero: (p, v) => { p.jerseyNumber = v ? parseInt(v, 10) : undefined; },
  jersey_number: (p, v) => { p.jerseyNumber = v ? parseInt(v, 10) : undefined; },
  posicao: (p, v) => { p.position = v ? normalizePosition(v) || v : undefined; },
  position: (p, v) => { p.position = v ? normalizePosition(v) || v : undefined; },
  pos: (p, v) => { p.position = v ? normalizePosition(v) || v : undefined; },
  pe_dominante: (p, v) => { p.preferredFoot = normalizePreferredFoot(v); },
  preferred_foot: (p, v) => { p.preferredFoot = normalizePreferredFoot(v); },
  pe: (p, v) => { p.preferredFoot = normalizePreferredFoot(v); },
  dominant_foot: (p, v) => { p.preferredFoot = normalizePreferredFoot(v); },
  time_atual: (p, v) => { p.currentTeam = v || undefined; },
  current_team: (p, v) => { p.currentTeam = v || undefined; },
  partidas: (p, v) => { p.matchesPlayed = v ? parseInt(v, 10) : undefined; },
  matches: (p, v) => { p.matchesPlayed = v ? parseInt(v, 10) : undefined; },
  gols: (p, v) => { p.goals = v ? parseInt(v, 10) : undefined; },
  goals: (p, v) => { p.goals = v ? parseInt(v, 10) : undefined; },
  assistencias: (p, v) => { p.assists = v ? parseInt(v, 10) : undefined; },
  assists: (p, v) => { p.assists = v ? parseInt(v, 10) : undefined; },
  amarelos: (p, v) => { p.yellowCards = v ? parseInt(v, 10) : undefined; },
  yellow_cards: (p, v) => { p.yellowCards = v ? parseInt(v, 10) : undefined; },
  vermelhos: (p, v) => { p.redCards = v ? parseInt(v, 10) : undefined; },
  red_cards: (p, v) => { p.redCards = v ? parseInt(v, 10) : undefined; },
  bio_pt: (p, v) => { p.bioPT = v || undefined; },
  bio_en: (p, v) => { p.bioEN = v || undefined; },
  instagram: (p, v) => { if (!p.socialMedia) p.socialMedia = {}; (p.socialMedia as PlayerSocialMedia).instagram = v || undefined; },
  twitter: (p, v) => { if (!p.socialMedia) p.socialMedia = {}; (p.socialMedia as PlayerSocialMedia).twitter = v || undefined; },
  facebook: (p, v) => { if (!p.socialMedia) p.socialMedia = {}; (p.socialMedia as PlayerSocialMedia).facebook = v || undefined; },
  tiktok: (p, v) => { if (!p.socialMedia) p.socialMedia = {}; (p.socialMedia as PlayerSocialMedia).tiktok = v || undefined; },
  youtube: (p, v) => { if (!p.socialMedia) p.socialMedia = {}; (p.socialMedia as PlayerSocialMedia).youtube = v || undefined; },
  website: (p, v) => { if (!p.socialMedia) p.socialMedia = {}; (p.socialMedia as PlayerSocialMedia).website = v || undefined; },
  melhores_momentos: (p, v) => { p.highlights = v ? v.split(/\|/).map((s) => s.trim()).filter(Boolean) : undefined; },
  highlights: (p, v) => { p.highlights = v ? v.split(/\|/).map((s) => s.trim()).filter(Boolean) : undefined; },
};

/** Converte uma linha (objeto por cabeçalho) em PlayerItem e retorna categoria id. */
function rowToPlayer(headers: string[], row: string[], tenantName: string): { categoryId: string; player: PlayerItem } {
  const player: PlayerItem = { id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, name: "", currentTeam: tenantName };
  let categoryId = "";
  for (let i = 0; i < headers.length; i++) {
    const key = normCol(headers[i]);
    const value = row[i]?.trim() ?? "";
    if (key === "categoria" || key === "category") {
      categoryId = value.toLowerCase().trim();
          const fixed = FIXTURE_CATEGORIES.find((c) => c.value === categoryId || c.labelPT.toLowerCase() === categoryId || c.labelEN.toLowerCase() === categoryId);
          if (fixed) categoryId = fixed.value;
      continue;
    }
    const setter = COLUMN_MAP[key];
    if (setter) setter(player, value);
  }
  return { categoryId, player };
}

/**
 * GET /api/google-sheets/times-categorias?spreadsheetId=...&gid=0&tenantName=...
 * Planilha deve ser "Qualquer pessoa com o link pode ver".
 * Primeira linha = cabeçalho. Coluna "categoria" = principal, sub20, sub17, etc.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const spreadsheetInput = (searchParams.get("spreadsheetId") ?? searchParams.get("url") ?? "").trim();
  const gid = searchParams.get("gid") ?? "0";
  const tenantName = searchParams.get("tenantName") ?? "";
  const slug = (searchParams.get("slug") ?? "").trim().toLowerCase();

  const decodedInput = spreadsheetInput
    ? (() => {
        try {
          return decodeURIComponent(spreadsheetInput);
        } catch {
          return spreadsheetInput;
        }
      })()
    : "";

  // Opção 1: URL "Publicar na Web" (formato .../d/e/2PACX-.../pub?output=csv) – não usa gid
  const publishedExportUrl = getPublishedExportUrl(decodedInput);
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
    const slugColIndex = getSlugColumnIndex(headers);
    const categoryMap = new Map<string, PlayerItem[]>();
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (slug && slugColIndex >= 0) {
        const rowSlug = getRowSlug(headers, row, slugColIndex);
        if (!rowSlug || rowSlug !== slug) continue;
      }
      const { categoryId, player } = rowToPlayer(headers, row, tenantName);
      if (!categoryId || !player.name?.trim()) continue;
      const list = categoryMap.get(categoryId) ?? [];
      list.push(player);
      categoryMap.set(categoryId, list);
    }
    const categories: TeamCategory[] = FIXTURE_CATEGORIES.map((cat) => ({
      id: cat.value,
      namePT: cat.labelPT,
      nameEN: cat.labelEN,
      players: categoryMap.get(cat.value) ?? [],
    }));
    return NextResponse.json({ categories });
  }

  // Opção 2: URL normal da planilha ou ID – usa export?format=csv&gid=...
  let spreadsheetId = extractSpreadsheetId(decodedInput);
  if (!spreadsheetId) {
    spreadsheetId = extractSpreadsheetId(spreadsheetInput);
  }
  if (!spreadsheetId) {
    return NextResponse.json(
      {
        error:
          "URL ou ID inválido. Use: (1) URL normal da planilha (docs.google.com/spreadsheets/d/...), (2) ID da planilha (~44 caracteres), ou (3) Link 'Publicado na Web' (Arquivo > Compartilhar > Publicar na Web).",
      },
      { status: 400 }
    );
  }

  const effectiveGid = (gid && gid !== "0") ? gid : (extractGidFromUrl(decodedInput) ?? "0");
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${effectiveGid}`;
  let res: Response;
  const fetchHeaders: HeadersInit = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0",
    Accept: "text/csv,text/plain,*/*",
  };
  try {
    res = await fetch(exportUrl, { cache: "no-store", headers: fetchHeaders });
  } catch (e) {
    return NextResponse.json(
      { error: "Não foi possível acessar a planilha. Verifique se ela está compartilhada como 'Qualquer pessoa com o link pode ver'." },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const statusHint =
      res.status === 403
        ? " (403 – acesso negado). Confira: Compartilhar > Qualquer pessoa com o link pode ver. Se já estiver assim, tente: Arquivo > Compartilhar > Publicar na Web (publicar a aba)."
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
          "A planilha retornou uma página de login em vez de dados. Para o servidor conseguir importar: (1) Compartilhar > 'Qualquer pessoa com o link' pode ver; (2) Ou Arquivo > Compartilhar > Publicar na Web > escolha a aba e publique como CSV.",
      },
      { status: 502 }
    );
  }

  const rows = parseCSV(text);
  const headers = rows[0] ?? [];
  const slugColIndex = getSlugColumnIndex(headers);
  const categoryMap = new Map<string, PlayerItem[]>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (slug && slugColIndex >= 0) {
      const rowSlug = getRowSlug(headers, row, slugColIndex);
      if (!rowSlug || rowSlug !== slug) continue;
    }
    const { categoryId, player } = rowToPlayer(headers, row, tenantName);
    if (!categoryId) continue;
    if (!player.name?.trim()) continue;
    const list = categoryMap.get(categoryId) ?? [];
    list.push(player);
    categoryMap.set(categoryId, list);
  }

  const categories: TeamCategory[] = FIXTURE_CATEGORIES.map((cat) => {
    const players = categoryMap.get(cat.value) ?? [];
    return {
      id: cat.value,
      namePT: cat.labelPT,
      nameEN: cat.labelEN,
      players,
    };
  });

  return NextResponse.json({ categories });
}
