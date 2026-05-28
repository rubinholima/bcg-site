import type { HomeContentBlock } from "@/types/home-content";

export type ImprensaDisplayMode = "inline" | "page";

export function getImprensaDisplayMode(block: HomeContentBlock): ImprensaDisplayMode {
  const mode = block.config?.imprensaDisplayMode as string | undefined;
  return mode === "page" ? "page" : "inline";
}

export function isImprensaPageOnlyBlock(block: HomeContentBlock): boolean {
  return block.type === "imprensa" && getImprensaDisplayMode(block) === "page";
}

export function isImprensaBlockVisible(block: HomeContentBlock): boolean {
  const v = block.config?.visible as boolean | string | undefined;
  return v !== false && v !== "false";
}

export function getImprensaPageHref(slug: string): string {
  return `/portfolio/${encodeURIComponent(slug)}/imprensa`;
}

export function findImprensaPageBlock(blocks: HomeContentBlock[]): HomeContentBlock | undefined {
  return blocks.find((b) => b.type === "imprensa" && isImprensaPageOnlyBlock(b) && isImprensaBlockVisible(b));
}

export function getImprensaMenuLabel(block: HomeContentBlock, lang: "pt" | "en"): string {
  if (lang === "en") {
    return (
      (block.config?.imprensaMenuLabelEn as string)?.trim() ||
      (block.config?.titleEn as string)?.trim() ||
      "Press"
    );
  }
  return (
    (block.config?.imprensaMenuLabelPt as string)?.trim() ||
    (block.config?.titlePt as string)?.trim() ||
    "Imprensa"
  );
}

export function getImprensaMenuLinks(
  blocks: HomeContentBlock[],
  slug: string,
  lang: "pt" | "en",
): Array<{ label: string; href: string }> {
  const block = findImprensaPageBlock(blocks);
  if (!block || block.config?.imprensaShowInMenu === false) return [];
  return [{ label: getImprensaMenuLabel(block, lang), href: getImprensaPageHref(slug) }];
}
