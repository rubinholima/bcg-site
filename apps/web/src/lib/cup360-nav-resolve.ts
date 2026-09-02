/**
 * Resolve itens do DASHBOARD_MENU por caminho de slugs e achata folhas para telas L3.
 */
import {
  DASHBOARD_MENU,
  type MenuItemConfig,
  canAccessMenuLeaf,
  hasAccessToMenuItem,
} from "./dashboard-menu.config";

export type ResolvedNavScreen = {
  id: string;
  label: string;
  href: string;
  icon?: MenuItemConfig["icon"];
  menuLogoSrc?: string;
  item: MenuItemConfig;
  pathPrefix: string;
};

export type ResolvedNavModule = {
  id: string;
  label: string;
  icon?: MenuItemConfig["icon"];
  screens: ResolvedNavScreen[];
};

export type ResolvedNavArea = {
  id: string;
  label: string;
  icon?: MenuItemConfig["icon"];
  modules: ResolvedNavModule[];
};

export type ResolvedNavStandalone = {
  id: string;
  label: string;
  href: string;
  icon?: MenuItemConfig["icon"];
  menuLogoSrc?: string;
  item: MenuItemConfig;
  pathPrefix: string;
};

/** Localiza item por sequência de slugs a partir do topo ou de um dept. */
export function findMenuItemByPath(slugs: string[]): {
  item: MenuItemConfig;
  pathPrefix: string;
  parentTopSlug: string;
} | null {
  if (slugs.length === 0) return null;

  let items: MenuItemConfig[] = DASHBOARD_MENU;
  let pathPrefix = "";
  let parentTopSlug = slugs[0]!;

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]!;
    const found = items.find((m) => m.slug === slug);
    if (!found) return null;
    if (i === 0) {
      pathPrefix = found.slug;
      parentTopSlug = found.slug;
    } else {
      pathPrefix = `${pathPrefix}/${found.slug}`;
    }
    if (i === slugs.length - 1) {
      return { item: found, pathPrefix, parentTopSlug };
    }
    if (!found.children?.length) return null;
    items = found.children;
  }
  return null;
}

/** Coleta todas as folhas com href abaixo de um nó (achata nível 4+). */
export function collectMenuLeaves(
  root: MenuItemConfig,
  rootPathPrefix: string,
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): ResolvedNavScreen[] {
  const screens: ResolvedNavScreen[] = [];

  const walk = (items: MenuItemConfig[], pathPrefix: string) => {
    for (const item of items) {
      if (item.children?.length) {
        walk(item.children, `${pathPrefix}/${item.slug}`);
        if (item.href && !item.external) {
          pushLeaf(item, pathPrefix);
        }
      } else if (item.href && !item.external) {
        pushLeaf(item, pathPrefix);
      }
    }
  };

  const pushLeaf = (item: MenuItemConfig, pathPrefix: string) => {
    if (
      canAccessMenuLeaf(item, pathPrefix, canAccessModule) ||
      (item.moduleSlug === "emails" && canAccessDashboard)
    ) {
      screens.push({
        id: `${pathPrefix}__${item.slug}`,
        label: item.label,
        href: item.href!,
        icon: item.icon,
        menuLogoSrc: item.menuLogoSrc,
        item,
        pathPrefix,
      });
    }
  };

  if (root.children?.length) {
    walk(root.children, rootPathPrefix);
    if (root.href && !root.external) {
      const parentPrefix = rootPathPrefix.includes("/")
        ? rootPathPrefix.slice(0, rootPathPrefix.lastIndexOf("/"))
        : rootPathPrefix;
      pushLeaf(root, parentPrefix || rootPathPrefix);
    }
  } else if (root.href && !root.external) {
    const parentPrefix = rootPathPrefix.includes("/")
      ? rootPathPrefix.slice(0, rootPathPrefix.lastIndexOf("/"))
      : rootPathPrefix;
    pushLeaf(root, parentPrefix || rootPathPrefix);
  }

  const seen = new Set<string>();
  return screens.filter((s) => {
    if (seen.has(s.href)) return false;
    seen.add(s.href);
    return true;
  });
}

export function isHrefActive(
  href: string,
  pathname: string | null,
  searchParams?: URLSearchParams | null,
): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (href !== "/dashboard" && pathname.startsWith(`${href}/`)) return true;
  if (href.includes("/dashboard/relatorios") && pathname.startsWith("/dashboard/relatorios")) {
    const hrefHub = href.split("/")[3];
    const pathHub = pathname.split("/")[3];
    if (hrefHub && pathHub === hrefHub && pathname === href) return true;
  }
  if (searchParams && href.includes("hub=")) {
    const hub = new URL(href, "http://local").searchParams.get("hub");
    if (hub && searchParams.get("hub") === hub && pathname.startsWith("/dashboard/relatorios")) {
      return pathname === href.split("?")[0];
    }
  }
  return false;
}

export function screenMatchesPath(screen: ResolvedNavScreen, pathname: string | null): boolean {
  if (!pathname) return false;
  return isHrefActive(screen.href, pathname);
}

export function moduleHasActiveScreen(module: ResolvedNavModule, pathname: string | null): boolean {
  return module.screens.some((s) => screenMatchesPath(s, pathname));
}

export function areaHasActiveScreen(area: ResolvedNavArea, pathname: string | null): boolean {
  return area.modules.some((m) => moduleHasActiveScreen(m, pathname));
}

export function standaloneMatchesPath(item: ResolvedNavStandalone, pathname: string | null): boolean {
  return isHrefActive(item.href, pathname);
}

export function hasAccessToMenuPath(
  slugs: string[],
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): boolean {
  const found = findMenuItemByPath(slugs);
  if (!found) return false;
  return hasAccessToMenuItem(
    found.item,
    found.pathPrefix.split("/")[0] ?? found.pathPrefix,
    canAccessModule,
    canAccessDashboard,
    isSuperAdmin,
  );
}
