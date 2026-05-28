import type { HomeContentDto, HomeContentBlock, HomeBlockType, GlobalPresenceCounter, GlobalPresenceLocation } from "@/types/home-content";
import type { Page } from "@/types/page";
import { getServerBackendBaseUrl } from "@/lib/apiProxy";
import { copy, type CopySchema } from "@/lib/home-copy";
import {
  buildDefaultImprensaCondutaSections,
  DEFAULT_IMPRENSA_RELEASE_EN,
  DEFAULT_IMPRENSA_RELEASE_PT,
} from "@/lib/imprensa-clube-default";

const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=80";
const DEFAULT_WHAT =
  "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&q=80";
const DEFAULT_FOUNDER =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80";
const DEFAULT_CTA =
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80";

export async function fetchHomeContent(): Promise<HomeContentDto | null> {
  try {
    const res = await fetch("/api/public/group-home", {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as HomeContentDto;
  } catch {
    return null;
  }
}

/**
 * Busca group-home diretamente do backend (server-side).
 * Usa getServerBackendBaseUrl() para NUNCA passar por Nginx — evita dados errados e UTF-8 corrompido.
 * Usar APENAS em Server Components (ex: page.tsx da home).
 */
export async function fetchGroupHomeFromBackend(): Promise<Page | null> {
  try {
    const base = getServerBackendBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/public/group-home`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as Page;
  } catch {
    return null;
  }
}

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown> | undefined
): T {
  if (!override || typeof override !== "object") return base;
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(override)) {
    const baseVal = result[key];
    const overrideVal = override[key];
    if (
      overrideVal != null &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal) &&
      baseVal != null &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overrideVal as Record<string, unknown>
      );
    } else if (overrideVal !== undefined && overrideVal !== "") {
      result[key] = overrideVal;
    }
  }
  return result as T;
}

function mergeLang(
  base: CopySchema,
  override: Record<string, unknown> | undefined
): CopySchema {
  if (!override) return base;
  return deepMerge(base as unknown as Record<string, unknown>, override) as unknown as CopySchema;
}

/** Ordem padrão dos módulos no meio da página (cabeçalho e rodapé são sempre fixos no topo/fim). */
export const DEFAULT_BLOCK_IDS: string[] = [
  "hero",
  "highlights",
  "what",
  "clubs",
  "companies",
  "founder",
  "how",
  "cta",
];

const BLOCK_LABELS: Record<string, { pt: string; en: string }> = {
  section: { pt: "Seção (colunas)", en: "Section (columns)" },
  header: { pt: "Cabeçalho", en: "Header" },
  footer: { pt: "Rodapé", en: "Footer" },
  hero: { pt: "Hero (manchete e fundo)", en: "Hero" },
  highlights: { pt: "Destaques (3 frases)", en: "Highlights" },
  what: { pt: "O que fazemos", en: "What we do" },
  clubs: { pt: "Clubes", en: "Clubs" },
  companies: { pt: "Empresas", en: "Companies" },
  eventos: { pt: "Nossos Eventos", en: "Our Events" },
  founder: { pt: "Fundador", en: "Founder" },
  how: { pt: "Como funciona", en: "How it works" },
  cta: { pt: "CTA final", en: "CTA" },
  custom: { pt: "Módulo customizado (título + texto + imagem)", en: "Custom (title + text + image)" },
  text: { pt: "Bloco de texto (título + corpo)", en: "Text block (title + body)" },
  // Clubes
  proximos_jogos: { pt: "Próximos jogos", en: "Upcoming matches" },
  ultimos_resultados: { pt: "Últimos resultados", en: "Last results" },
  proximos_eventos: { pt: "Próximos jogos (evento)", en: "Upcoming matches (event)" },
  ultimos_eventos: { pt: "Últimos resultados (evento)", en: "Last results (event)" },
  tabela_eventos: { pt: "Tabela / classificação (evento)", en: "Standings (event)" },
  times_categorias: { pt: "Times por categorias", en: "Teams by category" },
  noticias: { pt: "Notícias", en: "News" },
  calendario: { pt: "Calendário / Agenda", en: "Calendar" },
  tabela: { pt: "Tabela / Classificação", en: "Standings" },
  patrocinadores: { pt: "Patrocinadores", en: "Sponsors" },
  galeria: { pt: "Galeria de fotos", en: "Photo gallery" },
  hino: { pt: "Hino do clube", en: "Club anthem" },
  imprensa: { pt: "Imprensa / kit de marca", en: "Press / brand kit" },
  galeria_eventos: { pt: "Galeria de fotos do evento", en: "Event photo gallery" },
  // Empresas
  sobre: { pt: "Sobre nós", en: "About us" },
  servicos: { pt: "Serviços", en: "Services" },
  produtos: { pt: "Produtos", en: "Products" },
  equipe: { pt: "Nossa equipe", en: "Our team" },
  clientes: { pt: "Clientes / Cases", en: "Clients / Cases" },
  contato: { pt: "Contato", en: "Contact" },
  global_presence: { pt: "Presença Global / Expansão", en: "Global Presence" },
  logo_carousel: { pt: "Carrossel — Logos (Clubes & Empresas)", en: "Logo Carousel (Clubs & Companies)" },
  // Imobiliária
  imoveis_destaque: { pt: "Imóveis em destaque", en: "Featured properties" },
  formulario_captura: { pt: "Formulário de captura (leads)", en: "Lead capture form" },
  diferenciais: { pt: "Diferenciais", en: "Differentiators" },
  numeros: { pt: "Números / Estatísticas", en: "Stats & numbers" },
  como_funciona: { pt: "Como funciona (processo)", en: "How it works (process)" },
  faq: { pt: "Perguntas frequentes", en: "FAQ" },
};

/** Categorias por tipo de negócio — agrupam módulos no dropdown */
export const MODULE_CATEGORIES = [
  { id: "geral", label: "Geral (todos)" },
  { id: "futebol", label: "Futebol (clubes)" },
  { id: "empresas", label: "Empresas (geral)" },
  { id: "imobiliaria", label: "Imobiliária" },
  { id: "eventos", label: "Eventos" },
] as const;

export const MODULE_TYPE_FILTER_EVENTOS = "eventos";

export type ModuleCategory = (typeof MODULE_CATEGORIES)[number]["id"];

/** Mapeia o nome de um TenantKind (cadastro) para ModuleCategory (filtro de módulos). */
export function tenantKindNameToModuleCategory(kindName: string): ModuleCategory {
  const k = kindName.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (k.includes("futebol") || k.includes("clube") || k.includes("football")) return "futebol";
  if (k.includes("imobiliar") || k.includes("imoveis") || k.includes("imóveis")) return "imobiliaria";
  if (k.includes("evento") || k.includes("venue") || k.includes("local de evento")) return "eventos";
  if (k.includes("empresa")) return "empresas";
  return "geral";
}

export function resolveModuleCategoryFromFilter(
  moduleTypeFilter: string,
  context?: {
    tenantKind?: { id: string; name: string } | null;
    tenantKinds?: { id: string; name: string }[];
  },
): ModuleCategory {
  if (moduleTypeFilter === "geral") return "geral";
  if (moduleTypeFilter === MODULE_TYPE_FILTER_EVENTOS) return "eventos";
  const kind =
    context?.tenantKind?.id === moduleTypeFilter
      ? context.tenantKind
      : context?.tenantKinds?.find((k) => k.id === moduleTypeFilter);
  if (kind) return tenantKindNameToModuleCategory(kind.name);
  return "geral";
}

export function resolveModuleFilterLabel(
  moduleTypeFilter: string,
  context?: {
    tenantKind?: { id: string; name: string } | null;
    tenantKinds?: { id: string; name: string }[];
  },
): string {
  if (moduleTypeFilter === "geral") return "Geral";
  if (moduleTypeFilter === MODULE_TYPE_FILTER_EVENTOS) return "Eventos";
  const kind =
    context?.tenantKind?.id === moduleTypeFilter
      ? context.tenantKind
      : context?.tenantKinds?.find((k) => k.id === moduleTypeFilter);
  return kind?.name ?? moduleTypeFilter;
}

/** Módulos de venue/eventos cadastrados em imobiliária mas exibidos na categoria Eventos */
export const EVENTOS_SHARED_IMOBILIARIA_TYPES: HomeBlockType[] = [
  "formulario_captura",
  "diferenciais",
  "numeros",
  "como_funciona",
  "faq",
];

export function getMiddleModuleOptionsForCategory(category: ModuleCategory) {
  const middle = MODULE_OPTIONS.filter((o) => o.type !== "header" && o.type !== "footer");
  if (category === "geral") return middle.filter((o) => o.category === "geral");
  if (category === "eventos") {
    return middle.filter(
      (o) => o.category === "eventos" || EVENTOS_SHARED_IMOBILIARIA_TYPES.includes(o.type),
    );
  }
  return middle.filter((o) => o.category === category);
}

export function getModuleCategoryLabel(category: ModuleCategory): string {
  return MODULE_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

/** Opções para o dropdown "Adicionar módulo" — agrupadas por categoria */
export const MODULE_OPTIONS: { type: HomeBlockType; label: string; category: ModuleCategory }[] = [
  // Geral
  { type: "header", label: "Cabeçalho", category: "geral" },
  { type: "footer", label: "Rodapé", category: "geral" },
  { type: "hero", label: "Hero", category: "geral" },
  { type: "highlights", label: "Destaques", category: "geral" },
  { type: "text", label: "Bloco de texto", category: "geral" },
  { type: "custom", label: "Customizado (título + texto + imagem)", category: "geral" },
  { type: "what", label: "O que fazemos", category: "geral" },
  { type: "clubs", label: "Clubes", category: "geral" },
  { type: "companies", label: "Empresas", category: "geral" },
  { type: "founder", label: "Fundador", category: "geral" },
  { type: "how", label: "Como funciona", category: "geral" },
  { type: "cta", label: "CTA final", category: "geral" },
  { type: "section", label: "Seção (1, 2 ou 3 colunas)", category: "geral" },
  // Futebol
  { type: "proximos_jogos", label: "Próximos jogos", category: "futebol" },
  { type: "ultimos_resultados", label: "Últimos resultados", category: "futebol" },
  { type: "times_categorias", label: "Times por categorias", category: "futebol" },
  { type: "noticias", label: "Notícias", category: "futebol" },
  { type: "calendario", label: "Calendário / Agenda", category: "futebol" },
  { type: "tabela", label: "Tabela / Classificação", category: "futebol" },
  { type: "patrocinadores", label: "Patrocinadores", category: "futebol" },
  { type: "galeria", label: "Galeria de fotos", category: "futebol" },
  { type: "hino", label: "Hino do clube (letra + player)", category: "futebol" },
  { type: "imprensa", label: "Imprensa / kit de marca", category: "futebol" },
  // Empresas
  { type: "sobre", label: "Sobre nós", category: "empresas" },
  { type: "servicos", label: "Serviços", category: "empresas" },
  { type: "produtos", label: "Produtos", category: "empresas" },
  { type: "equipe", label: "Nossa equipe", category: "empresas" },
  { type: "clientes", label: "Clientes / Cases", category: "empresas" },
  { type: "contato", label: "Contato", category: "empresas" },
  { type: "imprensa", label: "Imprensa / kit de marca", category: "empresas" },
  { type: "global_presence", label: "Presença Global / Expansão", category: "empresas" },
  { type: "logo_carousel", label: "Carrossel — Logos (Clubes & Empresas)", category: "empresas" },
  // Eventos (páginas de venue, torneios, Boston City Hall, etc.)
  { type: "eventos", label: "Nossos Eventos", category: "eventos" },
  { type: "galeria_eventos", label: "Galeria de fotos do evento", category: "eventos" },
  { type: "proximos_eventos", label: "Próximos jogos (evento)", category: "eventos" },
  { type: "ultimos_eventos", label: "Últimos resultados (evento)", category: "eventos" },
  { type: "tabela_eventos", label: "Tabela / classificação (evento)", category: "eventos" },
  // Imobiliária
  { type: "imoveis_destaque", label: "Imóveis em destaque", category: "imobiliaria" },
  { type: "formulario_captura", label: "Formulário de captura (leads)", category: "imobiliaria" },
  { type: "diferenciais", label: "Diferenciais", category: "imobiliaria" },
  { type: "numeros", label: "Números / Estatísticas", category: "imobiliaria" },
  { type: "como_funciona", label: "Como funciona (processo)", category: "imobiliaria" },
  { type: "faq", label: "Perguntas frequentes", category: "imobiliaria" },
];

/**
 * Módulos específicos para páginas de EVENTOS, por tipo de negócio.
 * Quando o usuário seleciona Futebol/Empresas/etc. no editor de evento, só vê estes.
 * Geral: usa MODULE_OPTIONS (todos). Quando criar módulos para eventos->futebol, adicionar aqui.
 */
export const EVENT_PAGE_MODULES_BY_CATEGORY: Record<
  Exclude<ModuleCategory, "geral">,
  { type: HomeBlockType; label: string }[]
> = {
  futebol: [
    { type: "galeria_eventos", label: "Galeria de fotos do evento" },
    { type: "proximos_eventos", label: "Próximos jogos (evento)" },
    { type: "ultimos_eventos", label: "Últimos resultados (evento)" },
    { type: "tabela_eventos", label: "Tabela / classificação (evento)" },
  ],
  empresas: [],
  imobiliaria: [],
  eventos: [],
};

/** Módulos para páginas de evento quando o filtro não é Geral */
export function getEventPageModulesForCategory(category: ModuleCategory): { type: HomeBlockType; label: string }[] {
  if (category === "geral") return [];
  if (category === "eventos") {
    return getMiddleModuleOptionsForCategory("eventos").map((o) => ({ type: o.type, label: o.label }));
  }
  return EVENT_PAGE_MODULES_BY_CATEGORY[category] ?? [];
}

export function getBlockLabel(id: string, type: HomeBlockType, lang: "pt" | "en"): string {
  if (type === "custom" && id.startsWith("custom-")) return BLOCK_LABELS.custom[lang] + ` (${id})`;
  if (type === "text" && id.startsWith("text-")) return BLOCK_LABELS.text[lang] + ` (${id})`;
  return BLOCK_LABELS[id]?.[lang] ?? BLOCK_LABELS[type]?.[lang] ?? id;
}

/** Chaves de config que têm UI dedicada no editor. Usado em Campos adicionais para não duplicar. */
export const BLOCK_CONFIG_RESERVED_KEYS = new Set([
  "titlePt", "titleEn", "bodyPt", "bodyEn", "visible",
  "fontFamily", "contentWidth", "titleAlign", "sectionSize",
  "backgroundColor", "backgroundOverlayOpacity", "backgroundImage",
  "titleGradientStart", "titleGradientEnd",
  "imageUrl", "heroSlides", "heroCarouselEffect", "heroCarouselIntervalSeconds",
  "headerLogoUrl", "headerLinks", "headerTextColor", "headerPreset", "backgroundMode", "linkStyle", "logoSize", "sticky", "borderBottom", "borderColor", "showLanguage", "showHomeLink",
  "footerText", "footerLinks", "footerTextColor",
  "highlightsPt", "highlightsEn", "highlightsIcons",
  "whatImagePosition", "cardsPt", "cardsEn",
  "bulletsPt", "bulletsEn", "howBulletsIcons",
  "ctaLayout", "ctaTextAlign", "ctaContentWidth", "ctaBackgroundMode", "ctaOverlayOpacity", "ctaBlur", "ctaPreset", "ctaButtons", "primaryCTA", "secondaryCTA",
  "themePreset", "accentColor", "mapTint", "overlayOpacity", "showGridLines", "sectionHeight", "subtitlePT", "subtitleEN", "counters", "locations",
  "sectionColumns", "sectionLayout", "sectionLeftColumnTitlePt", "sectionLeftColumnTitleEn", "sectionRightColumnTitlePt", "sectionRightColumnTitleEn", "sectionMiddleColumnTitlePt", "sectionMiddleColumnTitleEn", "sectionLeftModules", "sectionRightModules", "sectionMiddleModules", "sectionPaddingTop", "sectionPaddingBottom",
  "sectionLeftColumnBackgroundColor", "sectionLeftColumnBackgroundImage", "sectionLeftColumnBackgroundOverlayOpacity",
  "sectionRightColumnBackgroundColor", "sectionRightColumnBackgroundImage", "sectionRightColumnBackgroundOverlayOpacity",
  "sectionMiddleColumnBackgroundColor", "sectionMiddleColumnBackgroundImage", "sectionMiddleColumnBackgroundOverlayOpacity",
  "proximosJogosDataSource", "proximosJogosManualFixtures", "proximosJogosOverrides", "proximosJogosPaddingTop", "proximosJogosPaddingBottom", "proximosJogosSpreadsheetUrl", "proximosJogosSheetGid", "fullBleedCarousel",
  "ultimosResultadosPaddingTop", "ultimosResultadosPaddingBottom", "ultimosResultadosMaxItems", "resultadosManuais", "resultadosDetalhes",
  "noticiasDataSource", "noticiasRssUrl", "noticiasManualItems", "noticiasMaxItems", "noticiasPaddingTop", "noticiasPaddingBottom",
  "galeriaDataSource", "galeriaRssUrl", "galeriaManualItems", "galeriaMaxItems", "galeriaPaddingTop", "galeriaPaddingBottom",
  "hinoLetraPt", "hinoLetraEn", "hinoCifraPt", "hinoCifraEn", "hinoPartituraUrl", "hinoAudioUrl", "hinoDefaultTab", "hinoAccentColor", "hinoPlayerLabelPt", "hinoPlayerLabelEn", "hinoPaddingTop", "hinoPaddingBottom",
  "imprensaReleasePt", "imprensaReleaseEn", "imprensaUltimoJogoTituloPt", "imprensaUltimoJogoTituloEn", "imprensaUltimoJogoReleasePt", "imprensaUltimoJogoReleaseEn", "imprensaUltimoJogoData", "imprensaPressReleases", "imprensaHistoriaTituloPt", "imprensaHistoriaTituloEn", "imprensaHistoriaPt", "imprensaHistoriaEn", "imprensaContatoTextoPt", "imprensaContatoTextoEn", "imprensaCredencialNotifyEmail", "imprensaContatoEmail", "imprensaContatoTelefone", "imprensaContatoWhatsapp", "imprensaLogoUrl", "imprensaManualMarcaUrl", "imprensaHinoAudioUrl", "imprensaCondutaSections", "imprensaAccentColor", "imprensaPaddingTop", "imprensaPaddingBottom", "imprensaDisplayMode", "imprensaShowInMenu", "imprensaMenuLabelPt", "imprensaMenuLabelEn", "imprensaRequireAccessCode",
  "patrocinadoresTitleLogo", "patrocinadoresManualItems", "patrocinadoresPaddingTop", "patrocinadoresPaddingBottom",
  "timesCategoriasCategories", "timesCategoriasSpreadsheetUrl", "timesCategoriasSheetGid", "timesCategoriasPaddingTop", "timesCategoriasPaddingBottom",
  "tabelaDataSource", "tabelaManualRows", "tabelaSpreadsheetUrl", "tabelaSheetGid", "tabelaPaddingTop", "tabelaPaddingBottom",
  "logoCarouselSectionPadding", "logoCarouselCardStyle", "logoCarouselCardHeight", "logoCarouselCardRadius", "logoCarouselCardBackground", "logoCarouselShowShadow", "logoCarouselGapBetweenCards", "logoCarouselAnimationSpeed", "logoCarouselPauseOnHover", "logoCarouselDirection", "logoCarouselOpenInNewTab",
  "logoCarouselClubsEnabled", "logoCarouselClubsTitlePT", "logoCarouselClubsTitleEN", "logoCarouselClubsLimit", "logoCarouselClubsSorting",
  "logoCarouselCompaniesEnabled", "logoCarouselCompaniesTitlePT", "logoCarouselCompaniesTitleEN", "logoCarouselCompaniesLimit", "logoCarouselCompaniesSorting",
  "logoCarouselCardWidthRatio", "logoCarouselPaddingTop", "logoCarouselPaddingBottom",
  "imoveisDestaqueItems", "formularioCapturaEndpoint", "formularioCapturaTitlePt", "formularioCapturaTitleEn",
  "diferenciaisItems", "numerosItems", "comoFuncionaBulletsPt", "comoFuncionaBulletsEn", "comoFuncionaIcons",
  "faqItems",
]);

/** Tipos que usam config título + corpo (e opcionalmente imagem) no editor */
export const BLOCK_TYPES_WITH_BODY: HomeBlockType[] = [
  "text",
  "custom",
  "clubs",
  "companies",
  "eventos",
  "proximos_jogos",
  "ultimos_resultados",
  "proximos_eventos",
  "ultimos_eventos",
  "tabela_eventos",
  "times_categorias",
  "noticias",
  "calendario",
  "tabela",
  "patrocinadores",
  "galeria",
  "sobre",
  "servicos",
  "produtos",
  "equipe",
  "clientes",
  "contato",
  "imoveis_destaque",
  "formulario_captura",
  "diferenciais",
  "numeros",
  "como_funciona",
  "faq",
];

/** Contadores padrão do Presença Global (para merge no dashboard quando faltar algum). */
export const DEFAULT_GLOBAL_PRESENCE_COUNTERS: GlobalPresenceCounter[] = [
  { key: "clubs", labelPT: "Clubes", labelEN: "Clubs", value: 0, enabled: true },
  { key: "companies", labelPT: "Empresas", labelEN: "Companies", value: 0, enabled: true },
  { key: "athletes", labelPT: "Atletas", labelEN: "Athletes", value: 0, enabled: true },
  { key: "projects", labelPT: "Projetos", labelEN: "Projects", value: 0, enabled: true },
  { key: "countries", labelPT: "Países", labelEN: "Countries", value: 0, enabled: true },
];

/** Garante que a lista de contadores tenha todos os 5 (clubes, empresas, atletas, projetos, países). */
export function mergeGlobalPresenceCounters(
  counters: GlobalPresenceCounter[] | undefined
): GlobalPresenceCounter[] {
  const byKey = new Map<string, GlobalPresenceCounter>();
  for (const c of DEFAULT_GLOBAL_PRESENCE_COUNTERS) {
    byKey.set(c.key, { ...c });
  }
  if (Array.isArray(counters)) {
    for (const c of counters) {
      if (c && typeof c.key === "string") {
        byKey.set(c.key, {
          key: c.key as GlobalPresenceCounter["key"],
          labelPT: c.labelPT ?? (DEFAULT_GLOBAL_PRESENCE_COUNTERS.find((d) => d.key === c.key)?.labelPT ?? c.key),
          labelEN: c.labelEN ?? (DEFAULT_GLOBAL_PRESENCE_COUNTERS.find((d) => d.key === c.key)?.labelEN ?? c.key),
          value: typeof c.value === "number" ? c.value : 0,
          enabled: c.enabled !== false,
        });
      }
    }
  }
  return DEFAULT_GLOBAL_PRESENCE_COUNTERS.map((d) => byKey.get(d.key) ?? d);
}

/** Cria um novo bloco do tipo indicado (para adicionar à página). */
export function createBlock(type: HomeBlockType, sortOrder: number): HomeContentBlock {
  const needsUniqueId =
    type === "custom" ||
    type === "text" ||
    type === "section" ||
    BLOCK_TYPES_WITH_BODY.includes(type);
  const id = needsUniqueId ? `${type}-${Date.now()}` : type;
  const config: Record<string, unknown> = BLOCK_TYPES_WITH_BODY.includes(type)
    ? { titlePt: "", titleEn: "", bodyPt: "", bodyEn: "" }
    : {};
  if (type === "custom") (config as Record<string, unknown>).imageUrl = "";
  if (type === "hero") {
    config.heroSlides = [];
    config.heroCarouselEffect = "fade";
    config.heroCarouselIntervalSeconds = 10;
  }
  if (type === "header") {
    config.headerLogoUrl = "";
    config.headerLinks = [];
    config.headerTextColor = "";
  }
  if (type === "footer") {
    config.footerText = "";
    config.footerLinks = [];
    config.footerTextColor = "";
  }
  if (type === "highlights") {
    config.highlightsPt = ["", "", ""];
    config.highlightsEn = ["", "", ""];
    config.highlightsIcons = ["Trophy", "Globe", "Layers"];
  }
  if (type === "what") {
    config.imageUrl = "";
    config.whatImagePosition = "right";
    config.cardsPt = [{ title: "", body: "" }, { title: "", body: "" }, { title: "", body: "" }, { title: "", body: "" }];
    config.cardsEn = [{ title: "", body: "" }, { title: "", body: "" }, { title: "", body: "" }, { title: "", body: "" }];
  }
  if (type === "how") {
    config.bulletsPt = ["", "", "", ""];
    config.bulletsEn = ["", "", "", ""];
    config.howBulletsIcons = ["CheckCircle", "CheckCircle", "CheckCircle", "CheckCircle"];
  }
  if (type === "cta") {
    config.ctaLayout = "centered";
    config.ctaTextAlign = "center";
    config.ctaContentWidth = "normal";
    config.ctaBackgroundMode = "image";
    config.ctaOverlayOpacity = 0.75;
    config.ctaBlur = false;
    config.ctaPreset = "custom";
    config.ctaButtons = [
      { labelPT: "Acessar Dashboard", labelEN: "Access Dashboard", type: "primary", href: "/dashboard", openInNewTab: false, highlighted: true },
      { labelPT: "Explorar Empresas", labelEN: "Explore Companies", type: "secondary", href: "#companies", openInNewTab: false },
    ];
  }
  if (type === "global_presence") {
    config.themePreset = "fifa";
    config.backgroundColor = "#0a0a0f";
    config.accentColor = "#38bdf8";
    config.mapTint = "#334155";
    config.overlayOpacity = 0.4;
    config.showGridLines = false;
    config.sectionHeight = "normal";
    config.subtitlePT = "Não somos locais. Somos plataforma.";
    config.subtitleEN = "We are not local. We are a platform.";
    config.counters = [...DEFAULT_GLOBAL_PRESENCE_COUNTERS];
    config.locations = [] as GlobalPresenceLocation[];
  }
  if (type === "section") {
    config.sectionColumns = 2;
    config.sectionLayout = "50-50";
    config.sectionLeftColumnTitlePt = "";
    config.sectionLeftColumnTitleEn = "";
    config.sectionRightColumnTitlePt = "";
    config.sectionRightColumnTitleEn = "";
    config.sectionMiddleColumnTitlePt = "";
    config.sectionMiddleColumnTitleEn = "";
    config.sectionLeftModules = [];
    config.sectionRightModules = [];
    config.sectionMiddleModules = [];
    config.sectionPaddingTop = "compact";
    config.sectionPaddingBottom = "compact";
  }
  if (type === "proximos_jogos" || type === "proximos_eventos") {
    config.proximosJogosDataSource = "manual";
    config.proximosJogosManualFixtures = [];
    config.proximosJogosOverrides = {};
    config.proximosJogosPaddingTop = "compact";
    config.proximosJogosPaddingBottom = "compact";
  }
  if (type === "ultimos_resultados" || type === "ultimos_eventos") {
    config.ultimosResultadosPaddingTop = "compact";
    config.ultimosResultadosPaddingBottom = "compact";
    config.ultimosResultadosMaxItems = 10;
    config.resultadosManuais = {};
  }
  if (type === "noticias") {
    config.noticiasDataSource = "rss";
    config.noticiasRssUrl = "";
    config.noticiasManualItems = [];
    config.noticiasMaxItems = 10;
    config.noticiasPaddingTop = "compact";
    config.noticiasPaddingBottom = "compact";
  }
  if (type === "galeria") {
    config.galeriaDataSource = "rss_com_manual";
    config.galeriaRssUrl = "";
    config.galeriaManualItems = [];
    config.galeriaMaxItems = 10;
    config.galeriaPaddingTop = "compact";
    config.galeriaPaddingBottom = "compact";
  }
  if (type === "hino") {
    config.titlePt = "Hino do Clube";
    config.titleEn = "Club Anthem";
    config.hinoDefaultTab = "letra";
    config.hinoLetraPt = "";
    config.hinoLetraEn = "";
    config.hinoCifraPt = "";
    config.hinoCifraEn = "";
    config.hinoPartituraUrl = "";
    config.hinoAudioUrl = "";
    config.hinoPlayerLabelPt = "Ouça o hino oficial";
    config.hinoPlayerLabelEn = "Listen to the official anthem";
    config.hinoPaddingTop = "compact";
    config.hinoPaddingBottom = "compact";
  }
  if (type === "imprensa") {
    config.titlePt = "Imprensa";
    config.titleEn = "Press";
    config.imprensaDisplayMode = "inline";
    config.imprensaShowInMenu = true;
    config.imprensaRequireAccessCode = true;
    config.imprensaReleasePt = DEFAULT_IMPRENSA_RELEASE_PT;
    config.imprensaReleaseEn = DEFAULT_IMPRENSA_RELEASE_EN;
    config.imprensaCondutaSections = buildDefaultImprensaCondutaSections("Clube");
    config.imprensaPaddingTop = "compact";
    config.imprensaPaddingBottom = "compact";
  }
  if (type === "galeria_eventos") {
    config.titlePt = "Galeria de fotos";
    config.titleEn = "Photo gallery";
  }
  if (type === "patrocinadores") {
    config.patrocinadoresManualItems = [];
    config.patrocinadoresPaddingTop = "compact";
    config.patrocinadoresPaddingBottom = "compact";
  }
  if (type === "times_categorias") {
    config.timesCategoriasCategories = [];
    config.timesCategoriasPaddingTop = "compact";
    config.timesCategoriasPaddingBottom = "compact";
  }
  if (type === "tabela" || type === "tabela_eventos") {
    config.tabelaDataSource = "manual";
    config.tabelaManualRows = [];
    config.tabelaPaddingTop = "compact";
    config.tabelaPaddingBottom = "compact";
  }
  if (type === "logo_carousel") {
    config.backgroundColor = "#0f0f12";
    config.logoCarouselSectionPadding = "normal";
    config.logoCarouselCardStyle = "fifa";
    config.logoCarouselCardHeight = 80;
    config.logoCarouselCardRadius = 12;
    config.logoCarouselCardBackground = "#FFFFFF";
    config.logoCarouselShowShadow = true;
    config.logoCarouselGapBetweenCards = 16;
    config.logoCarouselAnimationSpeed = "normal";
    config.logoCarouselPauseOnHover = true;
    config.logoCarouselDirection = "left-to-right";
    config.logoCarouselOpenInNewTab = true;
    config.logoCarouselClubsEnabled = true;
    config.logoCarouselClubsTitlePT = "Clubes";
    config.logoCarouselClubsTitleEN = "Clubs";
    config.logoCarouselClubsLimit = 50;
    config.logoCarouselClubsSorting = "alphabetical";
    config.logoCarouselCompaniesEnabled = true;
    config.logoCarouselCompaniesTitlePT = "Empresas";
    config.logoCarouselCompaniesTitleEN = "Companies";
    config.logoCarouselCompaniesLimit = 50;
    config.logoCarouselCompaniesSorting = "alphabetical";
  }
  if (type === "imoveis_destaque") {
    config.imoveisDestaqueItems = [];
  }
  if (type === "formulario_captura") {
    config.formularioCapturaTitlePt = "Entre em contato";
    config.formularioCapturaTitleEn = "Get in touch";
    config.formularioCapturaEndpoint = "";
  }
  if (type === "diferenciais") {
    config.diferenciaisItems = [
      { icon: "Award", titlePt: "", titleEn: "", bodyPt: "", bodyEn: "" },
      { icon: "Target", titlePt: "", titleEn: "", bodyPt: "", bodyEn: "" },
      { icon: "CheckCircle", titlePt: "", titleEn: "", bodyPt: "", bodyEn: "" },
      { icon: "Building2", titlePt: "", titleEn: "", bodyPt: "", bodyEn: "" },
    ];
  }
  if (type === "numeros") {
    config.numerosItems = [
      { value: 0, labelPt: "Imóveis vendidos", labelEn: "Properties sold" },
      { value: 0, labelPt: "Anos de experiência", labelEn: "Years of experience" },
      { value: 0, labelPt: "Clientes satisfeitos", labelEn: "Happy clients" },
    ];
  }
  if (type === "como_funciona") {
    config.comoFuncionaBulletsPt = ["", "", "", ""];
    config.comoFuncionaBulletsEn = ["", "", "", ""];
    config.comoFuncionaIcons = ["CheckCircle", "CheckCircle", "CheckCircle", "CheckCircle"];
  }
  if (type === "faq") {
    config.faqItems = [];
  }

  return { id, type, sortOrder, config };
}

/** Retorna lista ordenada de blocos: do conteúdo ou padrão (hero, highlights, ...). */
export function getOrderedBlocks(content: HomeContentDto | null): HomeContentBlock[] {
  const blocks = content?.blocks;
  if (blocks && blocks.length > 0) {
    return [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return DEFAULT_BLOCK_IDS.map((id, index) => ({
    id,
    type: id as HomeBlockType,
    sortOrder: index,
    config: {},
  }));
}

export function mergeHomeContent(content: HomeContentDto | null) {
  const pt = mergeLang(copy.pt, content?.pt as Record<string, unknown> | undefined);
  const en = mergeLang(copy.en, content?.en as Record<string, unknown> | undefined);
  const images = {
    hero: content?.images?.hero || DEFAULT_HERO,
    what: content?.images?.what || DEFAULT_WHAT,
    founder: content?.images?.founder || DEFAULT_FOUNDER,
    cta: content?.images?.cta || DEFAULT_CTA,
  };
  const blocks = getOrderedBlocks(content);
  return { pt, en, images, blocks };
}

function getBlockByType(
  blocks: HomeContentBlock[],
  type: string
): HomeContentBlock | undefined {
  return blocks.find((b) => b.type === type);
}

/** Extrai URLs de imagens dos blocos (hero, what, founder, cta) para a Home. */
export function getImagesFromBlocks(blocks: HomeContentBlock[]): {
  hero: string;
  what: string;
  founder: string;
  cta: string;
} {
  const heroBlock = getBlockByType(blocks, "hero");
  const whatBlock = getBlockByType(blocks, "what");
  const founderBlock = getBlockByType(blocks, "founder");
  const ctaBlock = getBlockByType(blocks, "cta");

  const heroSlides = Array.isArray(heroBlock?.config?.heroSlides)
    ? heroBlock.config.heroSlides
    : [];
  const heroImagesLegacy = Array.isArray(heroBlock?.config?.heroImages)
    ? heroBlock.config.heroImages
    : [];
  const heroFirstUrl =
    heroSlides[0]?.url?.trim() ||
    heroImagesLegacy[0]?.trim() ||
    (heroBlock?.config?.backgroundImage as string)?.trim() ||
    undefined;

  return {
    hero: heroFirstUrl || DEFAULT_HERO,
    what: (whatBlock?.config?.imageUrl as string) || DEFAULT_WHAT,
    founder:
      (founderBlock?.config?.founderPhoto as string) ||
      (founderBlock?.config?.imageUrl as string) ||
      DEFAULT_FOUNDER,
    cta: (ctaBlock?.config?.backgroundImage as string) || DEFAULT_CTA,
  };
}

/** Constrói o objeto de textos (t) a partir dos blocos, com fallback no copy. */
export function buildTFromBlocks(
  blocks: HomeContentBlock[],
  copyLang: CopySchema,
  lang: "pt" | "en"
): CopySchema {
  const isPt = lang === "pt";
  const titleKey = isPt ? "titlePt" : "titleEn";
  const bodyKey = isPt ? "bodyPt" : "bodyEn";

  const heroBlock = getBlockByType(blocks, "hero");
  const highlightsBlock = getBlockByType(blocks, "highlights");
  const whatBlock = getBlockByType(blocks, "what");
  const clubsBlock = getBlockByType(blocks, "clubs");
  const companiesBlock = getBlockByType(blocks, "companies");
  const eventosBlock = getBlockByType(blocks, "eventos");
  const founderBlock = getBlockByType(blocks, "founder");
  const howBlock = getBlockByType(blocks, "how");
  const ctaBlock = getBlockByType(blocks, "cta");

  const headline =
    (heroBlock?.config?.[titleKey] as string)?.trim() || copyLang.hero?.headline || "";
  const subheadline =
    (heroBlock?.config?.[bodyKey] as string)?.trim() || copyLang.hero?.subheadline || "";
  const ctaClubs =
    (heroBlock?.config as Record<string, string>)?.[isPt ? "ctaClubsPt" : "ctaClubsEn"]?.trim() ||
    copyLang.hero?.ctaClubs ||
    "";
  const ctaCompanies =
    (heroBlock?.config as Record<string, string>)?.[isPt ? "ctaCompaniesPt" : "ctaCompaniesEn"]?.trim() ||
    copyLang.hero?.ctaCompanies ||
    "";

  const highlightsArr = (highlightsBlock?.config as Record<string, string[] | undefined>)?.[
    isPt ? "highlightsPt" : "highlightsEn"
  ];
  const highlights: string[] = Array.isArray(highlightsArr) && highlightsArr.length >= 3
    ? [highlightsArr[0], highlightsArr[1], highlightsArr[2]]
    : copyLang.highlights ?? ["", "", ""];

  const whatTitle = (whatBlock?.config?.[titleKey] as string)?.trim() || copyLang.what?.title || "";
  const whatBody = (whatBlock?.config?.[bodyKey] as string)?.trim() || copyLang.what?.body || "";
  const cardsKey = isPt ? "cardsPt" : "cardsEn";
  const cardsRaw = (whatBlock?.config as Record<string, Array<{ title?: string; body?: string }>>)?.[cardsKey];
  const whatCards = Array.isArray(cardsRaw) && cardsRaw.length > 0
    ? cardsRaw.map((c) => ({ title: c?.title ?? "", body: c?.body ?? "" }))
    : copyLang.what?.cards ?? [];

  const clubsTitle = (clubsBlock?.config?.[titleKey] as string)?.trim() || copyLang.clubs?.title || "";
  const clubsSubtext = (clubsBlock?.config?.[bodyKey] as string)?.trim() || copyLang.clubs?.subtext || "";

  const companiesTitle = (companiesBlock?.config?.[titleKey] as string)?.trim() || copyLang.companies?.title || "";
  const companiesSubtext = (companiesBlock?.config?.[bodyKey] as string)?.trim() || copyLang.companies?.subtext || "";

  const eventosTitle = (eventosBlock?.config?.[titleKey] as string)?.trim() || copyLang.eventos?.title || "";
  const eventosSubtext = (eventosBlock?.config?.[bodyKey] as string)?.trim() || copyLang.eventos?.subtext || "";

  const founderTitle = (founderBlock?.config?.[titleKey] as string)?.trim() || copyLang.founder?.title || "";
  const founderBody = (founderBlock?.config?.[bodyKey] as string)?.trim() || copyLang.founder?.body || "";
  const founderBulletsKey = isPt ? "bulletsPt" : "bulletsEn";
  const founderBulletsRaw = (founderBlock?.config as Record<string, string[] | undefined>)?.[founderBulletsKey];
  const founderBullets: string[] = Array.isArray(founderBulletsRaw) && founderBulletsRaw.length >= 3
    ? [founderBulletsRaw[0], founderBulletsRaw[1], founderBulletsRaw[2]]
    : copyLang.founder?.bullets ?? ["", "", ""];
  const founderQuote =
    (founderBlock?.config as Record<string, string>)?.[isPt ? "quotePt" : "quoteEn"]?.trim() ||
    copyLang.founder?.quote ||
    "";

  const howTitle = (howBlock?.config?.[titleKey] as string)?.trim() || copyLang.how?.title || "";
  const howBody = (howBlock?.config?.[bodyKey] as string)?.trim() || copyLang.how?.body || "";
  const howBulletsKey = isPt ? "bulletsPt" : "bulletsEn";
  const howBulletsRaw = (howBlock?.config as Record<string, string[] | undefined>)?.[howBulletsKey];
  const howBullets: string[] = Array.isArray(howBulletsRaw) && howBulletsRaw.length >= 4
    ? [howBulletsRaw[0], howBulletsRaw[1], howBulletsRaw[2], howBulletsRaw[3]]
    : copyLang.how?.bullets ?? ["", "", "", ""];

  const ctaTitle = (ctaBlock?.config?.[titleKey] as string)?.trim() || copyLang.cta?.title || "";
  const ctaBody = (ctaBlock?.config?.[bodyKey] as string)?.trim() || copyLang.cta?.body || "";

  return {
    ...copyLang,
    nav: copyLang.nav,
    hero: { headline, subheadline, ctaClubs, ctaCompanies },
    highlights,
    what: { title: whatTitle, body: whatBody, cards: whatCards },
    clubs: {
      title: clubsTitle,
      subtext: clubsSubtext,
      visitSite: copyLang.clubs?.visitSite ?? "",
      openProfile: copyLang.clubs?.openProfile ?? "",
    },
    companies: {
      title: companiesTitle,
      subtext: companiesSubtext,
      visitWebsite: copyLang.companies?.visitWebsite ?? "",
      openProfile: copyLang.companies?.openProfile ?? "",
    },
    eventos: {
      title: eventosTitle,
      subtext: eventosSubtext,
      viewEvent: copyLang.eventos?.viewEvent ?? "",
    },
    founder: {
      title: founderTitle,
      body: founderBody,
      bullets: founderBullets,
      quote: founderQuote,
    },
    how: { title: howTitle, body: howBody, bullets: howBullets },
    cta: {
      title: ctaTitle,
      body: ctaBody,
      contact: copyLang.cta?.contact ?? "",
      dashboard: copyLang.cta?.dashboard ?? "",
    },
    errorBanner: copyLang.errorBanner ?? "",
  } as CopySchema;
}
