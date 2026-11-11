import {
  BUILDER_BLOCK_REGISTRY,
  getBlockDefinition,
  type BuilderBlockType,
  type BuilderPageContext,
} from "@bcg/page-builder-core";
import { createBlock } from "@/lib/home-content";
import { EXTENDED_BLOCK_TYPES } from "@/lib/page-builder/registry-bridge";

/** Blocos com ramo dedicado em BlockRenderer (meio da página). */
export const BLOCK_RENDERER_DEDICATED: BuilderBlockType[] = [
  "section",
  "hero",
  "highlights",
  "what",
  "how",
  "cta",
  "clubs",
  "companies",
  "global_presence",
  "calendario",
  "logo_carousel",
  "eventos",
  "bch_upcoming_events",
  "noticias",
  "galeria",
  "galeria_eventos",
  "email_servers",
  "hino",
  "imprensa",
  "times_categorias",
  "tabela",
  "tabela_eventos",
  "proximos_jogos",
  "proximos_eventos",
  "imoveis_destaque",
  "formulario_captura",
  "diferenciais",
  "numeros",
  "como_funciona",
  "faq",
  "ultimos_resultados",
  "ultimos_eventos",
];

/** Renderizados fora do BlockRenderer (shell). */
export const BLOCK_SHELL_TYPES: BuilderBlockType[] = ["header", "footer"];

/** Generic fallback intencional (título/corpo/imagem). */
export const BLOCK_GENERIC_RENDERER: BuilderBlockType[] = [
  "text",
  "custom",
  "sobre",
  "servicos",
  "produtos",
  "equipe",
  "clientes",
  "contato",
  "founder",
  "patrocinadores",
];

export const STYLE_KEYS_SHARED = [
  "backgroundColor",
  "backgroundImage",
  "backgroundOverlayOpacity",
  "titleAlign",
  "subtitleAlign",
  "bodyAlign",
  "fontFamily",
  "contentWidth",
  "titleGradientStart",
  "titleGradientEnd",
  "sectionPaddingTop",
  "sectionPaddingBottom",
  "maxContentWidth",
  "visible",
  "styleResponsive",
] as const;

export function blockHasRendererCoverage(type: string): boolean {
  const t = type.toLowerCase() as BuilderBlockType;
  if (BLOCK_SHELL_TYPES.includes(t)) return true;
  if (BLOCK_RENDERER_DEDICATED.includes(t)) return true;
  if (BLOCK_GENERIC_RENDERER.includes(t)) return true;
  if ((EXTENDED_BLOCK_TYPES as readonly string[]).includes(t)) return true;
  return !!getBlockDefinition(t);
}

export function validateRegistryParity(context: BuilderPageContext = "tenant_page"): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  for (const def of BUILDER_BLOCK_REGISTRY) {
    if (!def.contexts.includes(context) && context !== "tenant_page") continue;
    if (!blockHasRendererCoverage(def.type)) {
      errors.push(`Sem cobertura de renderer: ${def.type}`);
    }
    try {
      const block = createBlock(def.type, 1);
      if (!block?.id || block.type !== def.type) {
        errors.push(`createBlock falhou: ${def.type}`);
      }
    } catch {
      errors.push(`createBlock exceção: ${def.type}`);
    }
  }
  for (const ext of EXTENDED_BLOCK_TYPES) {
    try {
      createBlock(ext, 1);
    } catch {
      errors.push(`createBlock ext: ${ext}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function listParityTypesChecked(): number {
  return BUILDER_BLOCK_REGISTRY.length;
}
