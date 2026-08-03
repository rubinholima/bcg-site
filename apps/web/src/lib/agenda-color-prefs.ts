/** Preferências de cor da agenda (localStorage) — editáveis pelo usuário. */

export const AGENDA_COLOR_PREF_KEY = "bcg-agenda-event-colors-v1";

export type AgendaColorKey =
  | "casa"
  | "fora"
  | "treino"
  | "reuniao"
  | "jogo"
  | "compromisso"
  | "preparacao"
  | "aniversario"
  | "palco"
  | "outro";

export type AgendaColorSwatch = {
  bg: string;
  text: string;
  border: string;
};

export const AGENDA_COLOR_LABELS: Record<AgendaColorKey, string> = {
  casa: "JOGO EM CASA",
  fora: "JOGO FORA / VIAGEM",
  treino: "TREINO",
  reuniao: "REUNIÃO",
  jogo: "JOGO (GERAL)",
  compromisso: "COMPROMISSO",
  preparacao: "PREPARAÇÃO",
  aniversario: "ANIVERSÁRIO",
  palco: "BOSTON CITY HALL",
  outro: "OUTRO",
};

export const DEFAULT_AGENDA_COLORS: Record<AgendaColorKey, AgendaColorSwatch> = {
  casa: { bg: "#059669", text: "#ffffff", border: "#34d399" },
  fora: { bg: "#f59e0b", text: "#18181b", border: "#fcd34d" },
  treino: { bg: "#0d9488", text: "#ffffff", border: "#2dd4bf" },
  reuniao: { bg: "#0284c7", text: "#ffffff", border: "#38bdf8" },
  jogo: { bg: "#7c3aed", text: "#ffffff", border: "#a78bfa" },
  compromisso: { bg: "#0891b2", text: "#ffffff", border: "#22d3ee" },
  preparacao: { bg: "#ea580c", text: "#ffffff", border: "#fb923c" },
  aniversario: { bg: "#db2777", text: "#ffffff", border: "#f472b6" },
  palco: { bg: "#c026d3", text: "#ffffff", border: "#e879f9" },
  outro: { bg: "#52525b", text: "#ffffff", border: "#a1a1aa" },
};

function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

export function loadAgendaColors(): Record<AgendaColorKey, AgendaColorSwatch> {
  if (typeof window === "undefined") return { ...DEFAULT_AGENDA_COLORS };
  try {
    const raw = localStorage.getItem(AGENDA_COLOR_PREF_KEY);
    if (!raw) return { ...DEFAULT_AGENDA_COLORS };
    const parsed = JSON.parse(raw) as Partial<Record<AgendaColorKey, Partial<AgendaColorSwatch>>>;
    const out = { ...DEFAULT_AGENDA_COLORS };
    for (const key of Object.keys(DEFAULT_AGENDA_COLORS) as AgendaColorKey[]) {
      const sw = parsed[key];
      if (!sw) continue;
      out[key] = {
        bg: isHex(sw.bg) ? sw.bg : DEFAULT_AGENDA_COLORS[key].bg,
        text: isHex(sw.text) ? sw.text : DEFAULT_AGENDA_COLORS[key].text,
        border: isHex(sw.border) ? sw.border : DEFAULT_AGENDA_COLORS[key].border,
      };
    }
    return out;
  } catch {
    return { ...DEFAULT_AGENDA_COLORS };
  }
}

export function saveAgendaColors(colors: Record<AgendaColorKey, AgendaColorSwatch>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AGENDA_COLOR_PREF_KEY, JSON.stringify(colors));
}

export function resolveAgendaColorKey(
  type: string,
  matchSide?: "casa" | "fora" | null,
): AgendaColorKey {
  if (type === "viagem" || matchSide === "fora") return "fora";
  if (type === "jogo" && matchSide === "casa") return "casa";
  if (type === "jogo") return "jogo";
  if (type in DEFAULT_AGENDA_COLORS) return type as AgendaColorKey;
  return "outro";
}

export function agendaSwatchStyle(
  colors: Record<AgendaColorKey, AgendaColorSwatch>,
  type: string,
  matchSide?: "casa" | "fora" | null,
): { backgroundColor: string; color: string; borderColor: string } {
  const key = resolveAgendaColorKey(type, matchSide);
  const sw = colors[key] ?? DEFAULT_AGENDA_COLORS.outro;
  return {
    backgroundColor: sw.bg,
    color: sw.text,
    borderColor: sw.border,
  };
}
