/** Tipos de bloco — espelha HomeBlockType (web). */
export type BuilderBlockType =
  | "header"
  | "footer"
  | "hero"
  | "highlights"
  | "what"
  | "clubs"
  | "companies"
  | "eventos"
  | "bch_upcoming_events"
  | "founder"
  | "how"
  | "cta"
  | "custom"
  | "text"
  | "proximos_jogos"
  | "ultimos_resultados"
  | "proximos_eventos"
  | "ultimos_eventos"
  | "tabela_eventos"
  | "times_categorias"
  | "noticias"
  | "calendario"
  | "tabela"
  | "patrocinadores"
  | "galeria"
  | "hino"
  | "imprensa"
  | "galeria_eventos"
  | "sobre"
  | "servicos"
  | "produtos"
  | "equipe"
  | "clientes"
  | "contato"
  | "global_presence"
  | "logo_carousel"
  | "email_servers"
  | "imoveis_destaque"
  | "formulario_captura"
  | "diferenciais"
  | "numeros"
  | "como_funciona"
  | "faq"
  | "section";

export type BuilderModuleCategory = "geral" | "futebol" | "empresas" | "imobiliaria" | "eventos";

export type BuilderPageContext = "group_home" | "tenant_page" | "event_page";

export type BlockRendererKind =
  | "dedicated"
  | "marketing"
  | "sports"
  | "generic"
  | "shell";

export interface BlockDefinition {
  type: BuilderBlockType;
  labelPt: string;
  labelEn: string;
  category: BuilderModuleCategory;
  schemaVersion: number;
  renderer: BlockRendererKind;
  contexts: BuilderPageContext[];
  editorCapabilities: {
    appearance: boolean;
    typography: boolean;
    layout: boolean;
    responsive: boolean;
  };
}

const ALL_CONTEXTS: BuilderPageContext[] = ["group_home", "tenant_page", "event_page"];
const TENANT_AND_GROUP: BuilderPageContext[] = ["group_home", "tenant_page"];
const TENANT_ONLY: BuilderPageContext[] = ["tenant_page"];
const GROUP_ONLY: BuilderPageContext[] = ["group_home"];
const EVENT_EXTRA: BuilderPageContext[] = ["event_page"];

const defaultCaps = {
  appearance: true,
  typography: true,
  layout: true,
  responsive: false,
};

/** Registry canônico — fonte única para labels, categorias e paridade editor/renderer. */
export const BUILDER_BLOCK_REGISTRY: BlockDefinition[] = [
  { type: "header", labelPt: "Cabeçalho", labelEn: "Header", category: "geral", schemaVersion: 1, renderer: "shell", contexts: ALL_CONTEXTS, editorCapabilities: defaultCaps },
  { type: "footer", labelPt: "Rodapé", labelEn: "Footer", category: "geral", schemaVersion: 1, renderer: "shell", contexts: ALL_CONTEXTS, editorCapabilities: defaultCaps },
  { type: "hero", labelPt: "Hero", labelEn: "Hero", category: "geral", schemaVersion: 1, renderer: "dedicated", contexts: ALL_CONTEXTS, editorCapabilities: defaultCaps },
  { type: "highlights", labelPt: "Destaques", labelEn: "Highlights", category: "geral", schemaVersion: 1, renderer: "dedicated", contexts: TENANT_AND_GROUP, editorCapabilities: defaultCaps },
  { type: "text", labelPt: "Bloco de texto", labelEn: "Text block", category: "geral", schemaVersion: 1, renderer: "generic", contexts: ALL_CONTEXTS, editorCapabilities: defaultCaps },
  { type: "custom", labelPt: "Customizado", labelEn: "Custom", category: "geral", schemaVersion: 1, renderer: "generic", contexts: ALL_CONTEXTS, editorCapabilities: defaultCaps },
  { type: "section", labelPt: "Seção (colunas)", labelEn: "Section", category: "geral", schemaVersion: 1, renderer: "dedicated", contexts: ALL_CONTEXTS, editorCapabilities: defaultCaps },
  { type: "what", labelPt: "O que fazemos", labelEn: "What we do", category: "geral", schemaVersion: 1, renderer: "marketing", contexts: TENANT_AND_GROUP, editorCapabilities: defaultCaps },
  { type: "clubs", labelPt: "Clubes", labelEn: "Clubs", category: "geral", schemaVersion: 1, renderer: "marketing", contexts: GROUP_ONLY, editorCapabilities: defaultCaps },
  { type: "companies", labelPt: "Empresas", labelEn: "Companies", category: "geral", schemaVersion: 1, renderer: "marketing", contexts: GROUP_ONLY, editorCapabilities: defaultCaps },
  { type: "founder", labelPt: "Fundador", labelEn: "Founder", category: "geral", schemaVersion: 1, renderer: "dedicated", contexts: TENANT_AND_GROUP, editorCapabilities: defaultCaps },
  { type: "how", labelPt: "Como funciona", labelEn: "How it works", category: "geral", schemaVersion: 1, renderer: "marketing", contexts: TENANT_AND_GROUP, editorCapabilities: defaultCaps },
  { type: "cta", labelPt: "CTA final", labelEn: "CTA", category: "geral", schemaVersion: 1, renderer: "marketing", contexts: TENANT_AND_GROUP, editorCapabilities: defaultCaps },
  { type: "global_presence", labelPt: "Presença Global", labelEn: "Global Presence", category: "empresas", schemaVersion: 1, renderer: "marketing", contexts: TENANT_AND_GROUP, editorCapabilities: defaultCaps },
  { type: "logo_carousel", labelPt: "Carrossel de logos", labelEn: "Logo carousel", category: "empresas", schemaVersion: 1, renderer: "dedicated", contexts: TENANT_AND_GROUP, editorCapabilities: defaultCaps },
  { type: "eventos", labelPt: "Nossos Eventos", labelEn: "Our Events", category: "eventos", schemaVersion: 1, renderer: "dedicated", contexts: TENANT_AND_GROUP, editorCapabilities: defaultCaps },
  { type: "bch_upcoming_events", labelPt: "BCH — Próximos eventos", labelEn: "BCH upcoming", category: "eventos", schemaVersion: 1, renderer: "dedicated", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "proximos_jogos", labelPt: "Próximos jogos", labelEn: "Upcoming matches", category: "futebol", schemaVersion: 1, renderer: "sports", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "ultimos_resultados", labelPt: "Últimos resultados", labelEn: "Last results", category: "futebol", schemaVersion: 1, renderer: "sports", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "proximos_eventos", labelPt: "Próximos jogos (evento)", labelEn: "Fixtures (event)", category: "eventos", schemaVersion: 1, renderer: "sports", contexts: EVENT_EXTRA, editorCapabilities: defaultCaps },
  { type: "ultimos_eventos", labelPt: "Últimos resultados (evento)", labelEn: "Results (event)", category: "eventos", schemaVersion: 1, renderer: "sports", contexts: EVENT_EXTRA, editorCapabilities: defaultCaps },
  { type: "tabela_eventos", labelPt: "Tabela (evento)", labelEn: "Standings (event)", category: "eventos", schemaVersion: 1, renderer: "sports", contexts: EVENT_EXTRA, editorCapabilities: defaultCaps },
  { type: "times_categorias", labelPt: "Times por categorias", labelEn: "Teams", category: "futebol", schemaVersion: 1, renderer: "sports", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "noticias", labelPt: "Notícias", labelEn: "News", category: "futebol", schemaVersion: 1, renderer: "sports", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "calendario", labelPt: "Calendário / Agenda", labelEn: "Calendar", category: "futebol", schemaVersion: 1, renderer: "sports", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "tabela", labelPt: "Tabela / Classificação", labelEn: "Standings", category: "futebol", schemaVersion: 1, renderer: "sports", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "patrocinadores", labelPt: "Patrocinadores", labelEn: "Sponsors", category: "futebol", schemaVersion: 1, renderer: "dedicated", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "galeria", labelPt: "Galeria de fotos", labelEn: "Gallery", category: "futebol", schemaVersion: 1, renderer: "sports", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "hino", labelPt: "Hino do clube", labelEn: "Club anthem", category: "futebol", schemaVersion: 1, renderer: "dedicated", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "imprensa", labelPt: "Imprensa", labelEn: "Press", category: "futebol", schemaVersion: 1, renderer: "dedicated", contexts: ALL_CONTEXTS, editorCapabilities: defaultCaps },
  { type: "galeria_eventos", labelPt: "Galeria do evento", labelEn: "Event gallery", category: "eventos", schemaVersion: 1, renderer: "sports", contexts: EVENT_EXTRA, editorCapabilities: defaultCaps },
  { type: "sobre", labelPt: "Sobre nós", labelEn: "About", category: "empresas", schemaVersion: 1, renderer: "generic", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "servicos", labelPt: "Serviços", labelEn: "Services", category: "empresas", schemaVersion: 1, renderer: "generic", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "produtos", labelPt: "Produtos", labelEn: "Products", category: "empresas", schemaVersion: 1, renderer: "generic", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "equipe", labelPt: "Nossa equipe", labelEn: "Team", category: "empresas", schemaVersion: 1, renderer: "generic", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "clientes", labelPt: "Clientes / Cases", labelEn: "Clients", category: "empresas", schemaVersion: 1, renderer: "generic", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "contato", labelPt: "Contato", labelEn: "Contact", category: "empresas", schemaVersion: 1, renderer: "generic", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "email_servers", labelPt: "Servidores de e-mail", labelEn: "Email servers", category: "geral", schemaVersion: 1, renderer: "dedicated", contexts: GROUP_ONLY, editorCapabilities: defaultCaps },
  { type: "imoveis_destaque", labelPt: "Imóveis em destaque", labelEn: "Featured properties", category: "imobiliaria", schemaVersion: 1, renderer: "dedicated", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "formulario_captura", labelPt: "Formulário de leads", labelEn: "Lead form", category: "imobiliaria", schemaVersion: 1, renderer: "dedicated", contexts: ALL_CONTEXTS, editorCapabilities: defaultCaps },
  { type: "diferenciais", labelPt: "Diferenciais", labelEn: "Differentiators", category: "imobiliaria", schemaVersion: 1, renderer: "dedicated", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "numeros", labelPt: "Números", labelEn: "Stats", category: "imobiliaria", schemaVersion: 1, renderer: "dedicated", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "como_funciona", labelPt: "Como funciona", labelEn: "How it works", category: "imobiliaria", schemaVersion: 1, renderer: "dedicated", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
  { type: "faq", labelPt: "FAQ", labelEn: "FAQ", category: "imobiliaria", schemaVersion: 1, renderer: "dedicated", contexts: TENANT_ONLY, editorCapabilities: defaultCaps },
];

export const BUILDER_BLOCK_SCHEMA_VERSION = 1;

export function getBlockDefinition(type: string): BlockDefinition | undefined {
  const key = type.trim().toLowerCase();
  return BUILDER_BLOCK_REGISTRY.find((b) => b.type === key);
}

export function isBlockAllowedInContext(type: string, context: BuilderPageContext): boolean {
  const def = getBlockDefinition(type);
  if (!def) return true;
  return def.contexts.includes(context);
}

export function listRegistryBlockTypes(): BuilderBlockType[] {
  return BUILDER_BLOCK_REGISTRY.map((b) => b.type);
}
