import {
  ACCESS_GROUP_LABELS,
  getMenuAccessCatalog,
  getMenuAccessTree,
  type MenuAccessCatalogEntry,
  type MenuAccessTreeNode,
} from "@/lib/dashboard-menu.config";
import { MODULE_DISPLAY_NAMES } from "@/lib/dashboard-labels";

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

export const UNRESOLVED_PERMISSION_LABEL = "Permissão adicional";

/** Identificador técnico de autorização — não deve ser rótulo principal na UI. */
export function looksLikeAuthorizationSlug(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (v.includes("/") || v.includes("__")) return true;
  if (v.startsWith("group_")) return true;
  if (/^player_tab__/.test(v)) return true;
  if (/^[a-z][a-z0-9_]*$/i.test(v) && v.includes("_")) return true;
  return false;
}

/**
 * Mapa slug de autorização (Module.slug / catálogo CUP360) → rótulo humano do menu.
 */
export function buildAuthorizationSlugLabelMap(): Map<string, string> {
  const map = new Map<string, string>();

  const setLabel = (slug: string, label: string) => {
    const name = label.trim();
    if (!slug || !name || looksLikeAuthorizationSlug(name)) return;
    if (!map.has(slug)) map.set(slug, name);
  };

  for (const entry of getMenuAccessCatalog()) {
    setLabel(entry.slug, entry.name);
    if (entry.slug.startsWith("group_")) {
      const groupKey = entry.slug.slice("group_".length);
      const groupLabel = ACCESS_GROUP_LABELS[groupKey as keyof typeof ACCESS_GROUP_LABELS];
      if (groupLabel) setLabel(entry.slug, groupLabel);
    }
  }

  const byModuleSlug = new Map<string, MenuAccessCatalogEntry[]>();
  for (const entry of getMenuAccessCatalog()) {
    const list = byModuleSlug.get(entry.moduleSlug) ?? [];
    list.push(entry);
    byModuleSlug.set(entry.moduleSlug, list);
  }
  for (const [moduleSlug, entries] of byModuleSlug) {
    const exact = entries.find((e) => e.slug === moduleSlug);
    const pick = exact ?? entries[0];
    if (pick) setLabel(moduleSlug, pick.name);
  }

  const walk = (nodes: MenuAccessTreeNode[]) => {
    for (const node of nodes) {
      if (node.kind === "leaf" && node.accessSlug) {
        setLabel(node.accessSlug, node.label);
        setLabel(storageSlugFromTreeLeaf(node.accessSlug, node.moduleSlug), node.label);
      } else {
        walk(node.children);
      }
    }
  };
  walk(getMenuAccessTree());

  for (const [slug, name] of Object.entries(MODULE_DISPLAY_NAMES)) {
    setLabel(slug, name);
  }

  return map;
}

/** @deprecated Use buildAuthorizationSlugLabelMap */
export function buildStorageSlugLabelMap(
  tree: MenuAccessTreeNode[],
): Map<string, string> {
  void tree;
  return buildAuthorizationSlugLabelMap();
}

function normalizeSlugAlias(slug: string): string {
  return slug.replace(/\//g, "__");
}

export function humanLabelForAuthorizationSlug(
  slug: string,
  labelMap: Map<string, string>,
): string {
  const trimmed = slug.trim();
  if (!trimmed) return UNRESOLVED_PERMISSION_LABEL;

  const tryKey = (key: string): string | null => {
    const label = labelMap.get(key);
    if (label && !looksLikeAuthorizationSlug(label)) return label;
    return null;
  };

  const direct = tryKey(trimmed);
  if (direct) return direct;

  const aliased = normalizeSlugAlias(trimmed);
  if (aliased !== trimmed) {
    const fromAlias = tryKey(aliased);
    if (fromAlias) return fromAlias;
  }

  if (trimmed.startsWith("group_")) {
    const groupKey = trimmed.slice("group_".length);
    const groupLabel = ACCESS_GROUP_LABELS[groupKey as keyof typeof ACCESS_GROUP_LABELS];
    if (groupLabel) return groupLabel;
  }

  const display = MODULE_DISPLAY_NAMES[trimmed];
  if (display && !looksLikeAuthorizationSlug(display)) return display;

  return UNRESOLVED_PERMISSION_LABEL;
}

/** @deprecated Use humanLabelForAuthorizationSlug */
export function labelForStorageSlug(
  slug: string,
  labelMap: Map<string, string>,
): string {
  return humanLabelForAuthorizationSlug(slug, labelMap);
}
