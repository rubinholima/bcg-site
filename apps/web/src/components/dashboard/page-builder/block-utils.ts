import type { HomeContentBlock } from "@/types/home-content";
import { createBlock } from "@/lib/home-content";

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
  return list.map((b, i) => ({ ...b, sortOrder: i }));
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
