import type { HomeContentBlock } from "@/types/home-content";
import { createBlock } from "@/lib/home-content";
import { normalizeBlocks } from "@/components/dashboard/page-builder/block-utils";

export type FootballPageTemplateId =
  | "home"
  | "clube"
  | "times"
  | "jogos"
  | "classificacao"
  | "noticias"
  | "patrocinadores"
  | "ingressos"
  | "contato"
  | "imprensa";

export const FOOTBALL_TEMPLATE_LABELS: Record<FootballPageTemplateId, string> = {
  home: "Home",
  clube: "Clube",
  times: "Times / Elenco",
  jogos: "Jogos / Resultados",
  classificacao: "Classificação",
  noticias: "Notícias",
  patrocinadores: "Patrocinadores",
  ingressos: "Ingressos",
  contato: "Contato",
  imprensa: "Imprensa",
};

function shellMiddle(types: Parameters<typeof createBlock>[0][]): HomeContentBlock[] {
  const header = createBlock("header", 0);
  const footer = createBlock("footer", types.length + 1);
  const middle = types.map((type, i) => createBlock(type, i + 1));
  return normalizeBlocks([header, ...middle, footer]);
}

export function buildFootballPageTemplate(id: FootballPageTemplateId): HomeContentBlock[] {
  switch (id) {
    case "home":
      return shellMiddle(["hero", "match_day_hero", "proximos_jogos", "noticias", "patrocinadores"]);
    case "clube":
      return shellMiddle(["hero", "text", "stadium_public", "honors_block"]);
    case "times":
      return shellMiddle(["times_categorias", "technical_staff_public"]);
    case "jogos":
      return shellMiddle(["match_day_hero", "proximos_jogos", "ultimos_resultados", "calendario"]);
    case "classificacao":
      return shellMiddle(["tabela", "ultimos_resultados"]);
    case "noticias":
      return shellMiddle(["noticias", "galeria"]);
    case "patrocinadores":
      return shellMiddle(["patrocinadores", "social_links_block"]);
    case "ingressos":
      return shellMiddle(["match_day_hero", "membership_public", "formulario_captura"]);
    case "contato":
      return shellMiddle(["text", "formulario_captura", "social_links_block"]);
    case "imprensa":
      return shellMiddle(["imprensa", "galeria"]);
    default:
      return shellMiddle(["text"]);
  }
}
