import {
  CUP360_EXECUTIVE_STANDALONE,
  CUP360_MASTER_STANDALONE,
  CUP360_PRIMARY_DEPARTMENTS,
  CUP360_SYSTEM_DEPARTMENT,
  type Cup360DepartmentRef,
  type Cup360FlyoutGroupRef,
  type Cup360FlyoutItemRef,
  type Cup360PresentationModuleRef,
  type Cup360PresentationScreenRef,
} from "./cup360-nav-presentation";
import { Settings } from "lucide-react";
import { DASHBOARD_MENU } from "./dashboard-menu.config";
import {
  collectMenuLeaves,
  findMenuItemByPath,
  type ResolvedNavScreen,
  type ResolvedNavStandalone,
} from "./cup360-nav-resolve";

export type ResolvedFlyoutLink = {
  kind: "link";
  screen: ResolvedNavScreen;
};

export type ResolvedFlyoutModule = {
  kind: "module";
  moduleId: string;
  label: string;
  screenCount: number;
};

export type ResolvedFlyoutGroup = {
  id: string;
  label: string;
  items: Array<ResolvedFlyoutLink | ResolvedFlyoutModule>;
};

export type ResolvedDepartment = {
  id: string;
  label: string;
  icon: Cup360DepartmentRef["icon"];
  subtitle?: string;
  flyoutColumns: 1 | 2;
  rootGroups: ResolvedFlyoutGroup[];
  modules: Record<string, ResolvedDepartmentModule>;
};

export type ResolvedDepartmentModule = {
  id: string;
  label: string;
  screens: ResolvedNavScreen[];
  contextGroups: ResolvedFlyoutGroup[];
  contextColumns: 1 | 2;
};

export type Cup360NavV3 = {
  master: ResolvedNavStandalone | null;
  executive: ResolvedNavStandalone | null;
  departments: ResolvedDepartment[];
  system: ResolvedDepartment | null;
};

function dedupeScreens(screens: ResolvedNavScreen[]): ResolvedNavScreen[] {
  const seen = new Set<string>();
  return screens.filter((s) => {
    if (seen.has(s.href)) return false;
    seen.add(s.href);
    return true;
  });
}

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
    const leaves = collectMenuLeaves(
      found.item,
      found.pathPrefix,
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

function resolveModuleScreens(
  mod: Cup360PresentationModuleRef,
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): ResolvedNavScreen[] {
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
    if (!found) return [];
    screens = collectMenuLeaves(
      found.item,
      found.pathPrefix,
      canAccessModule,
      canAccessDashboard,
      isSuperAdmin,
    );
  }

  return screens;
}

function resolveFlyoutItem(
  item: Cup360FlyoutItemRef,
  modules: Record<string, Cup360PresentationModuleRef>,
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): ResolvedFlyoutLink | ResolvedFlyoutModule | null {
  if (item.kind === "screen") {
    const found = findMenuItemByPath(item.menuPath);
    if (!found) return null;
    const leaves = collectMenuLeaves(
      found.item,
      found.pathPrefix,
      canAccessModule,
      canAccessDashboard,
      isSuperAdmin,
    );
    if (leaves.length === 0) return null;
    const screen = { ...leaves[0]!, label: item.label ?? leaves[0]!.label };
    return { kind: "link", screen };
  }

  const mod = modules[item.moduleId];
  if (!mod) return null;
  const screens = resolveModuleScreens(
    mod,
    canAccessModule,
    canAccessDashboard,
    isSuperAdmin,
  );
  if (screens.length === 0) return null;

  if (screens.length === 1 && !mod.contextGroups?.length) {
    return {
      kind: "link",
      screen: { ...screens[0]!, label: item.label ?? mod.label },
    };
  }

  return {
    kind: "module",
    moduleId: item.moduleId,
    label: item.label ?? mod.label,
    screenCount: screens.length,
  };
}

function resolveFlyoutGroups(
  groupRefs: Cup360FlyoutGroupRef[],
  modules: Record<string, Cup360PresentationModuleRef>,
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): ResolvedFlyoutGroup[] {
  const groups: ResolvedFlyoutGroup[] = [];
  for (const groupRef of groupRefs) {
    const items: Array<ResolvedFlyoutLink | ResolvedFlyoutModule> = [];
    for (const itemRef of groupRef.items) {
      const resolved = resolveFlyoutItem(
        itemRef,
        modules,
        canAccessModule,
        canAccessDashboard,
        isSuperAdmin,
      );
      if (resolved) items.push(resolved);
    }
    if (items.length > 0) {
      groups.push({ id: groupRef.id, label: groupRef.label, items });
    }
  }
  return groups;
}

function collectScreensFromFlyoutGroups(
  groups: ResolvedFlyoutGroup[],
  modules: Record<string, ResolvedDepartmentModule>,
): ResolvedNavScreen[] {
  const screens: ResolvedNavScreen[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (item.kind === "link") {
        screens.push(item.screen);
      } else {
        const mod = modules[item.moduleId];
        if (mod) screens.push(...mod.screens);
      }
    }
  }
  return screens;
}

function resolveDepartmentModule(
  mod: Cup360PresentationModuleRef,
  deptModules: Record<string, Cup360PresentationModuleRef>,
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): ResolvedDepartmentModule | null {
  let screens = resolveModuleScreens(
    mod,
    canAccessModule,
    canAccessDashboard,
    isSuperAdmin,
  );

  let contextGroups: ResolvedFlyoutGroup[];
  if (mod.contextGroups?.length) {
    contextGroups = resolveFlyoutGroups(
      mod.contextGroups,
      deptModules,
      canAccessModule,
      canAccessDashboard,
      isSuperAdmin,
    );
    const fromGroups = collectScreensFromFlyoutGroups(contextGroups, {});
    for (const item of mod.contextGroups) {
      for (const entry of item.items) {
        if (entry.kind === "screen") {
          const found = findMenuItemByPath(entry.menuPath);
          if (!found) continue;
          const leaves = collectMenuLeaves(
            found.item,
            found.pathPrefix,
            canAccessModule,
            canAccessDashboard,
            isSuperAdmin,
          );
          if (leaves[0]) screens.push({ ...leaves[0], label: entry.label ?? leaves[0].label });
        } else if (entry.kind === "module") {
          const nested = deptModules[entry.moduleId];
          if (nested) {
            screens.push(
              ...resolveModuleScreens(
                nested,
                canAccessModule,
                canAccessDashboard,
                isSuperAdmin,
              ),
            );
          }
        }
      }
    }
    screens = dedupeScreens([...screens, ...fromGroups]);
  } else {
    contextGroups = [
      {
        id: `${mod.id}_screens`,
        label: mod.label.toUpperCase(),
        items: screens.map((screen) => ({
          kind: "link" as const,
          screen,
        })),
      },
    ];
  }

  if (screens.length === 0) return null;

  return {
    id: mod.id,
    label: mod.label,
    screens,
    contextGroups,
    contextColumns: mod.contextColumns ?? 1,
  };
}

function resolveDepartment(
  dept: Cup360DepartmentRef,
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): ResolvedDepartment | null {
  const modules: Record<string, ResolvedDepartmentModule> = {};
  for (const modRef of Object.values(dept.modules)) {
    const resolved = resolveDepartmentModule(
      modRef,
      dept.modules,
      canAccessModule,
      canAccessDashboard,
      isSuperAdmin,
    );
    if (resolved) modules[modRef.id] = resolved;
  }

  const rootGroups = resolveFlyoutGroups(
    dept.rootGroups,
    dept.modules,
    canAccessModule,
    canAccessDashboard,
    isSuperAdmin,
  );

  if (rootGroups.length === 0) return null;

  return {
    id: dept.id,
    label: dept.label,
    icon: dept.icon,
    subtitle: dept.subtitle,
    flyoutColumns: dept.flyoutColumns ?? 1,
    rootGroups,
    modules,
  };
}

function resolveStandalone(
  ref: typeof CUP360_EXECUTIVE_STANDALONE,
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): ResolvedNavStandalone | null {
  const found = findMenuItemByPath(ref.menuPath);
  if (!found?.item.href) return null;
  const leaves = collectMenuLeaves(
    found.item,
    found.pathPrefix,
    canAccessModule,
    canAccessDashboard,
    isSuperAdmin,
  );
  if (leaves.length === 0 && ref.id === "master" && canAccessDashboard) {
    return {
      id: ref.id,
      label: ref.label,
      href: found.item.href,
      icon: ref.icon ?? found.item.icon,
      menuLogoSrc: found.item.menuLogoSrc,
      item: found.item,
      pathPrefix: found.pathPrefix,
      tag: ref.tag,
    };
  }
  if (leaves.length === 0) return null;
  return {
    id: ref.id,
    label: ref.label,
    href: found.item.href,
    icon: ref.icon ?? found.item.icon,
    menuLogoSrc: found.item.menuLogoSrc,
    item: found.item,
    pathPrefix: found.pathPrefix,
    tag: ref.tag,
  };
}

export function buildCup360NavV3(
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
  options?: { includeMaster?: boolean; masterHref?: string; masterLabel?: string },
): Cup360NavV3 {
  let master: ResolvedNavStandalone | null = null;
  if (options?.includeMaster !== false && canAccessDashboard) {
    master = resolveStandalone(
      CUP360_MASTER_STANDALONE,
      canAccessModule,
      canAccessDashboard,
      isSuperAdmin,
    );
    if (master && options?.masterHref) {
      master = {
        ...master,
        href: options.masterHref,
        label: options.masterLabel ?? master.label,
      };
    }
  }

  const executive = resolveStandalone(
    CUP360_EXECUTIVE_STANDALONE,
    canAccessModule,
    canAccessDashboard,
    isSuperAdmin,
  );

  const departments: ResolvedDepartment[] = [];
  for (const deptRef of CUP360_PRIMARY_DEPARTMENTS) {
    const dept = resolveDepartment(
      deptRef,
      canAccessModule,
      canAccessDashboard,
      isSuperAdmin,
    );
    if (dept) departments.push(dept);
  }

  const system = resolveDepartment(
    CUP360_SYSTEM_DEPARTMENT,
    canAccessModule,
    canAccessDashboard,
    isSuperAdmin,
  );

  return { master, executive, departments, system };
}

/** @deprecated v1 — use buildCup360NavV3 */
export function buildCup360NavTree(
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
) {
  const v3 = buildCup360NavV3(canAccessModule, canAccessDashboard, isSuperAdmin);
  return {
    executive: v3.executive,
    areas: v3.departments.map((d) => ({
      id: d.id,
      label: d.label,
      icon: d.icon,
      modules: Object.values(d.modules).map((m) => ({
        id: m.id,
        label: m.label,
        screens: m.screens,
      })),
    })),
  };
}

export function getFlyoutView(
  nav: Cup360NavV3,
  departmentId: string,
  moduleContextId: string | null,
): {
  department: ResolvedDepartment;
  moduleContext: ResolvedDepartmentModule | null;
  groups: ResolvedFlyoutGroup[];
  columns: 1 | 2;
  breadcrumb: { areaLabel: string; moduleLabel?: string };
} | null {
  const department =
    departmentId === "sistema"
      ? nav.system
      : nav.departments.find((d) => d.id === departmentId);
  if (!department) return null;

  if (moduleContextId) {
    const moduleContext = department.modules[moduleContextId];
    if (!moduleContext) return null;
    return {
      department,
      moduleContext,
      groups: moduleContext.contextGroups,
      columns: moduleContext.contextColumns,
      breadcrumb: { areaLabel: department.label, moduleLabel: moduleContext.label },
    };
  }

  return {
    department,
    moduleContext: null,
    groups: department.rootGroups,
    columns: department.flyoutColumns,
    breadcrumb: { areaLabel: department.label },
  };
}

export type ActiveNavContextV3 = {
  masterActive: boolean;
  executiveActive: boolean;
  departmentId: string | null;
  moduleContextId: string | null;
  screenHref: string | null;
};

export function findActiveNavContextV3(
  pathname: string | null,
  nav: Cup360NavV3,
): ActiveNavContextV3 {
  if (nav.master && pathname) {
    const isMasterPath =
      pathname === nav.master.href ||
      (nav.master.href === "/dashboard" &&
        pathname.startsWith("/dashboard") &&
        !pathname.startsWith("/dashboard/clube") &&
        pathname.split("/").length === 2);
    if (isMasterPath && nav.master.href === "/dashboard" && pathname === "/dashboard") {
      return {
        masterActive: true,
        executiveActive: false,
        departmentId: null,
        moduleContextId: null,
        screenHref: pathname,
      };
    }
    if (pathname === nav.master.href || pathname.startsWith(`${nav.master.href}/`)) {
      return {
        masterActive: true,
        executiveActive: false,
        departmentId: null,
        moduleContextId: null,
        screenHref: pathname,
      };
    }
  }

  if (nav.executive && pathname) {
    if (pathname === nav.executive.href || pathname.startsWith(`${nav.executive.href}/`)) {
      return {
        masterActive: false,
        executiveActive: true,
        departmentId: null,
        moduleContextId: null,
        screenHref: pathname,
      };
    }
  }

  const allDepts = [...nav.departments, ...(nav.system ? [nav.system] : [])];

  for (const dept of allDepts) {
    for (const mod of Object.values(dept.modules)) {
      for (const screen of mod.screens) {
        const active =
          pathname === screen.href ||
          (screen.href !== "/dashboard" && !!pathname?.startsWith(`${screen.href}/`));
        if (active) {
          return {
            masterActive: false,
            executiveActive: false,
            departmentId: dept.id,
            moduleContextId: mod.id,
            screenHref: screen.href,
          };
        }
      }
    }
  }

  return {
    masterActive: false,
    executiveActive: false,
    departmentId: null,
    moduleContextId: null,
    screenHref: null,
  };
}

/** @deprecated v1 */
export function findActiveNavContext(
  pathname: string | null,
  areas: Array<{ id: string; modules: Array<{ id: string; screens: ResolvedNavScreen[] }> }>,
  executive: ResolvedNavStandalone | null,
) {
  const ctx = findActiveNavContextV3(pathname, {
    master: null,
    executive,
    departments: areas.map((a) => ({
      id: a.id,
      label: a.id,
      icon: Settings,
      flyoutColumns: 1 as const,
      rootGroups: [],
      modules: Object.fromEntries(
        a.modules.map((m) => [
          m.id,
          {
            id: m.id,
            label: m.id,
            screens: m.screens,
            contextGroups: [],
            contextColumns: 1 as const,
          },
        ]),
      ),
    })),
    system: null,
  });
  return {
    areaId: ctx.departmentId,
    moduleId: ctx.moduleContextId,
    executiveActive: ctx.executiveActive,
  };
}

function collectDepartmentScreens(dept: ResolvedDepartment): ResolvedNavScreen[] {
  const screens: ResolvedNavScreen[] = [];
  for (const mod of Object.values(dept.modules)) {
    screens.push(...mod.screens);
  }
  screens.push(...collectScreensFromFlyoutGroups(dept.rootGroups, dept.modules));
  return dedupeScreens(screens);
}

export function collectAllPresentationScreens(nav: Cup360NavV3): ResolvedNavScreen[] {
  const screens: ResolvedNavScreen[] = [];
  if (nav.master) {
    screens.push({
      id: nav.master.id,
      label: nav.master.label,
      href: nav.master.href,
      icon: nav.master.icon,
      menuLogoSrc: nav.master.menuLogoSrc,
      item: nav.master.item,
      pathPrefix: nav.master.pathPrefix,
    });
  }
  if (nav.executive) {
    screens.push({
      id: nav.executive.id,
      label: nav.executive.label,
      href: nav.executive.href,
      icon: nav.executive.icon,
      menuLogoSrc: nav.executive.menuLogoSrc,
      item: nav.executive.item,
      pathPrefix: nav.executive.pathPrefix,
    });
  }
  for (const dept of nav.departments) {
    screens.push(...collectDepartmentScreens(dept));
  }
  if (nav.system) screens.push(...collectDepartmentScreens(nav.system));
  return dedupeScreens(screens);
}

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

export type Cup360NavCoverageReport = {
  menuLeafCount: number;
  presentationLeafCount: number;
  mapped: string[];
  missing: Array<{ href: string; label: string; menuPath: string }>;
  duplicates: string[];
  intentionalExclusions: Array<{ href: string; reason: string }>;
  flattenedViaPresentation: string[];
};

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
  const nav = buildCup360NavV3(
    canAccessModule,
    canAccessDashboard,
    isSuperAdmin,
    { includeMaster: true },
  );
  const presentationLeaves = collectAllPresentationScreens(nav);

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
      reason: "Dashboard Master (standalone acima dos departamentos)",
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
