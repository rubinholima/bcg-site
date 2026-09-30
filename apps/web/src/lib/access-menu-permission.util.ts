import type { MenuAccessTreeNode } from "@/lib/dashboard-menu.config";

/** Slug persistido (Module.slug) para defaults/overrides CUP360. */
export function storageSlugFromTreeLeaf(
  accessSlug: string,
  moduleSlug?: string,
): string {
  if (moduleSlug?.trim()) return moduleSlug.trim();
  return accessSlug;
}

export function collectModuleStorageSlugs(node: MenuAccessTreeNode): string[] {
  if (node.kind === "leaf") {
    if (!node.accessSlug) return [];
    return [storageSlugFromTreeLeaf(node.accessSlug, node.moduleSlug)];
  }
  return node.children.flatMap(collectModuleStorageSlugs);
}

export function buildModuleSlugSet(slugs: Iterable<string>): Set<string> {
  return new Set(slugs);
}

/** Rótulo humano por Module.slug (folhas do menu CUP360). */
export function buildStorageSlugLabelMap(
  tree: MenuAccessTreeNode[],
): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (nodes: MenuAccessTreeNode[]) => {
    for (const node of nodes) {
      if (node.kind === "leaf" && node.accessSlug) {
        const storage = storageSlugFromTreeLeaf(node.accessSlug, node.moduleSlug);
        if (!map.has(storage)) map.set(storage, node.label);
      } else {
        walk(node.children);
      }
    }
  };
  walk(tree);
  return map;
}

export function labelForStorageSlug(
  slug: string,
  labelMap: Map<string, string>,
): string {
  return labelMap.get(slug) ?? slug;
}
