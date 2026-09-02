import {
  CUP360_EXECUTIVE_STANDALONE,
  CUP360_PRESENTATION_AREAS,
  type Cup360PresentationModuleRef,
  type Cup360PresentationScreenRef,
} from "./cup360-nav-presentation";
import { DASHBOARD_MENU } from "./dashboard-menu.config";
import {
  collectMenuLeaves,
  findMenuItemByPath,
  type ResolvedNavArea,
  type ResolvedNavModule,
  type ResolvedNavScreen,
  type ResolvedNavStandalone,
} from "./cup360-nav-resolve";

function resolveScreensFromRefs(
  refs: Cup360PresentationScreenRef[],
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): ResolvedNavScreen[] {
  const screens: ResolvedNavScreen[] = [];
  for (const ref of refs) {
    const found = findMenuItemByPath(ref.menuPath);
    if (!found) continue;
    const { item, pathPrefix } = found;
    const leaves = collectMenuLeaves(
      item,
      pathPrefix,
      canAccessModule,
      canAccessDashboard,
      isSuperAdmin,
    );
    if (leaves.length === 0) continue;
    if (leaves.length === 1) {
      screens.push({ ...leaves[0]!, label: ref.label ?? leaves[0]!.label });
    } else {
      screens.push(...leaves);
    }
  }
  return dedupeScreens(screens);
}

function resolveModule(
  mod: Cup360PresentationModuleRef,
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): ResolvedNavModule | null {
  let screens: ResolvedNavScreen[] = [];

  if (mod.screens?.length) {
    screens = resolveScreensFromRefs(
      mod.screens,
      canAccessModule,
      canAccessDashboard,
      isSuperAdmin,
    );
  } else if (mod.flattenPaths?.length) {
    for (const path of mod.flattenPaths) {
      const found = findMenuItemByPath(path);
      if (!found) continue;
      screens.push(
        ...collectMenuLeaves(
          found.item,
          found.pathPrefix,
          canAccessModule,
          canAccessDashboard,
          isSuperAdmin,
        ),
      );
    }
    screens = dedupeScreens(screens);
  } else if (mod.menuPath?.length) {
    const found = findMenuItemByPath(mod.menuPath);
    if (!found) return null;
    screens = collectMenuLeaves(
      found.item,
      found.pathPrefix,
      canAccessModule,
      canAccessDashboard,
      isSuperAdmin,
    );
  }

  if (screens.length === 0) return null;

  return {
    id: mod.id,
    label: mod.label,
    icon: mod.icon ?? screens[0]?.icon,
    screens,
  };
}

function dedupeScreens(screens: ResolvedNavScreen[]): ResolvedNavScreen[] {
  const seen = new Set<string>();
  return screens.filter((s) => {
    if (seen.has(s.href)) return false;
    seen.add(s.href);
    return true;
  });
}

export function buildCup360NavTree(
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): {
  executive: ResolvedNavStandalone | null;
  areas: ResolvedNavArea[];
} {
  let executive: ResolvedNavStandalone | null = null;
  const execFound = findMenuItemByPath(CUP360_EXECUTIVE_STANDALONE.menuPath);
  if (execFound?.item.href) {
    const leaves = collectMenuLeaves(
      execFound.item,
      execFound.pathPrefix,
      canAccessModule,
      canAccessDashboard,
      isSuperAdmin,
    );
    if (leaves.length > 0) {
      executive = {
        id: CUP360_EXECUTIVE_STANDALONE.id,
        label: CUP360_EXECUTIVE_STANDALONE.label,
        href: execFound.item.href,
        icon: CUP360_EXECUTIVE_STANDALONE.icon ?? execFound.item.icon,
        menuLogoSrc: execFound.item.menuLogoSrc,
        item: execFound.item,
        pathPrefix: execFound.pathPrefix,
      };
    }
  }

  const areas: ResolvedNavArea[] = [];

  for (const areaRef of CUP360_PRESENTATION_AREAS) {
    const modules: ResolvedNavModule[] = [];
    for (const modRef of areaRef.modules) {
      const mod = resolveModule(
        modRef,
        canAccessModule,
        canAccessDashboard,
        isSuperAdmin,
      );
      if (mod) modules.push(mod);
    }
    if (modules.length > 0) {
      areas.push({
        id: areaRef.id,
        label: areaRef.label,
        icon: areaRef.icon,
        modules,
      });
    }
  }

  return { executive, areas };
}

export function findActiveNavContext(
  pathname: string | null,
  areas: ResolvedNavArea[],
  executive: ResolvedNavStandalone | null,
): { areaId: string | null; moduleId: string | null; executiveActive: boolean } {
  if (executive && pathname) {
    if (pathname === executive.href || pathname.startsWith(`${executive.href}/`)) {
      return { areaId: null, moduleId: null, executiveActive: true };
    }
  }

  for (const area of areas) {
    for (const mod of area.modules) {
      const active = mod.screens.some(
        (s) =>
          pathname === s.href ||
          (s.href !== "/dashboard" && !!pathname?.startsWith(`${s.href}/`)),
      );
      if (active) {
        return { areaId: area.id, moduleId: mod.id, executiveActive: false };
      }
    }
  }

  return { areaId: null, moduleId: null, executiveActive: false };
}

/** Folhas autorizadas de todo o DASHBOARD_MENU (exceto home genérica). */
export function collectAllAuthorizedMenuLeaves(
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): ResolvedNavScreen[] {
  const screens: ResolvedNavScreen[] = [];
  for (const top of DASHBOARD_MENU) {
    if (top.slug === "dashboard") continue;
    screens.push(
      ...collectMenuLeaves(
        top,
        top.slug,
        canAccessModule,
        canAccessDashboard,
        isSuperAdmin,
      ),
    );
  }
  return dedupeScreens(screens);
}

function collectPresentationLeaves(
  executive: ResolvedNavStandalone | null,
  areas: ResolvedNavArea[],
): ResolvedNavScreen[] {
  const screens: ResolvedNavScreen[] = [];
  if (executive) {
    screens.push({
      id: executive.id,
      label: executive.label,
      href: executive.href,
      icon: executive.icon,
      menuLogoSrc: executive.menuLogoSrc,
      item: executive.item,
      pathPrefix: executive.pathPrefix,
    });
  }
  for (const area of areas) {
    for (const mod of area.modules) {
      screens.push(...mod.screens);
    }
  }
  return screens;
}

export type Cup360NavCoverageReport = {
  menuLeafCount: number;
  presentationLeafCount: number;
  mapped: string[];
  missing: Array<{ href: string; label: string; menuPath: string }>;
  duplicates: string[];
  intentionalExclusions: Array<{ href: string; reason: string }>;
  flattenedViaPresentation: string[];
};

/**
 * Compara destinos folha do menu canônico vs árvore de apresentação (RBAC aplicado).
 * `dashboard` genérico fica fora — representado pelo atalho Home dinâmico.
 */
export function auditCup360NavCoverage(
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): Cup360NavCoverageReport {
  const menuLeaves = collectAllAuthorizedMenuLeaves(
    canAccessModule,
    canAccessDashboard,
    isSuperAdmin,
  );
  const { executive, areas } = buildCup360NavTree(
    canAccessModule,
    canAccessDashboard,
    isSuperAdmin,
  );
  const presentationLeaves = collectPresentationLeaves(executive, areas);

  const menuByHref = new Map(menuLeaves.map((s) => [s.href, s]));
  const presHrefs = presentationLeaves.map((s) => s.href);
  const presHrefSet = new Set(presHrefs);

  const hrefCounts = new Map<string, number>();
  for (const href of presHrefs) {
    hrefCounts.set(href, (hrefCounts.get(href) ?? 0) + 1);
  }
  const duplicates = [...hrefCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([href]) => href);

  const mapped = menuLeaves
    .filter((s) => presHrefSet.has(s.href))
    .map((s) => s.href);

  const missing = menuLeaves
    .filter((s) => !presHrefSet.has(s.href))
    .map((s) => ({
      href: s.href,
      label: s.label,
      menuPath: s.pathPrefix,
    }));

  const intentionalExclusions: Array<{ href: string; reason: string }> = [];
  const dashboardHome = DASHBOARD_MENU.find((m) => m.slug === "dashboard");
  if (dashboardHome?.href) {
    intentionalExclusions.push({
      href: dashboardHome.href,
      reason: "Home dinâmica (atalho standalone acima das áreas)",
    });
  }

  const flattenedViaPresentation = mapped.filter((href) => {
    const leaf = menuByHref.get(href);
    if (!leaf) return false;
    return leaf.pathPrefix.includes("/");
  });

  return {
    menuLeafCount: menuLeaves.length,
    presentationLeafCount: presHrefSet.size,
    mapped,
    missing,
    duplicates,
    intentionalExclusions,
    flattenedViaPresentation,
  };
}
