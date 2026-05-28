import type { HomeContentBlock } from "@/types/home-content";
import { createBlock } from "@/lib/home-content";
import { normalizeHeroConfigOnLoad, sanitizeHeroConfigForSave } from "@/lib/hero-block.util";

function normalizeHeroInBlock(block: HomeContentBlock): HomeContentBlock {
  if (block.type === "hero") {
    return {
      ...block,
      config: normalizeHeroConfigOnLoad((block.config ?? {}) as Record<string, unknown>),
    };
  }
  if (block.type === "section") {
    const cfg = block.config ?? {};
    const mapMods = (mods: unknown): HomeContentBlock[] | undefined =>
      Array.isArray(mods)
        ? mods.map((m) => normalizeHeroInBlock(m as HomeContentBlock))
        : undefined;
    return {
      ...block,
      config: {
        ...cfg,
        sectionLeftModules: mapMods(cfg.sectionLeftModules),
        sectionMiddleModules: mapMods(cfg.sectionMiddleModules),
        sectionRightModules: mapMods(cfg.sectionRightModules),
      },
    };
  }
  return block;
}

/** Normaliza hero ao salvar (textos vazios removidos, slides sem URL removidos). */
export function sanitizeBlocksForSave(blocks: HomeContentBlock[]): HomeContentBlock[] {
  return blocks.map((block) => {
    const normalized = normalizeHeroInBlock(block);
    if (normalized.type === "hero") {
      return {
        ...normalized,
        config: sanitizeHeroConfigForSave((normalized.config ?? {}) as Record<string, unknown>),
      };
    }
    if (normalized.type === "section") {
      const cfg = normalized.config ?? {};
      const sanitizeMods = (mods: unknown): HomeContentBlock[] | undefined =>
        Array.isArray(mods)
          ? mods.map((m) => {
              const mod = m as HomeContentBlock;
              if (mod.type !== "hero") return mod;
              return {
                ...mod,
                config: sanitizeHeroConfigForSave((mod.config ?? {}) as Record<string, unknown>),
              };
            })
          : undefined;
      return {
        ...normalized,
        config: {
          ...cfg,
          sectionLeftModules: sanitizeMods(cfg.sectionLeftModules),
          sectionMiddleModules: sanitizeMods(cfg.sectionMiddleModules),
          sectionRightModules: sanitizeMods(cfg.sectionRightModules),
        },
      };
    }
    return normalized;
  });
}

export function sortBlocks(blocks: HomeContentBlock[]): HomeContentBlock[] {
  return [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Garante: primeiro bloco = cabeçalho, último = rodapé, meio = módulos reordenáveis. */
export function normalizeBlocks(blocks: HomeContentBlock[]): HomeContentBlock[] {
  const sorted = sortBlocks(blocks);
  const header = sorted.find((b) => b.type === "header") ?? createBlock("header", 0);
  const footer = sorted.find((b) => b.type === "footer") ?? createBlock("footer", 999);
  const middle = sorted.filter((b) => b.type !== "header" && b.type !== "footer");
  const list = [header, ...middle, footer];
  return list.map((b, i) => normalizeHeroInBlock({ ...b, sortOrder: i }));
}

export function isBlockHidden(block: HomeContentBlock): boolean {
  const v = block.config?.visible as boolean | string | undefined;
  return v === false || v === "false";
}

export function countMiddleModules(blocks: HomeContentBlock[]): number {
  return blocks.filter((b) => b.type !== "header" && b.type !== "footer").length;
}

export function countVisibleModules(blocks: HomeContentBlock[]): number {
  return blocks.filter((b) => b.type !== "header" && b.type !== "footer" && !isBlockHidden(b)).length;
}
