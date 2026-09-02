import type { Cup360NavV3 } from "./cup360-nav-build";
import type { ResolvedNavScreen } from "./cup360-nav-resolve";

export type Cup360NavSearchResult = {
  id: string;
  label: string;
  href: string;
  context: string;
  departmentId: string | null;
  normalizedLabel: string;
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildScreenIndex(nav: Cup360NavV3): Cup360NavSearchResult[] {
  const results: Cup360NavSearchResult[] = [];
  const seen = new Set<string>();

  const push = (
    screen: ResolvedNavScreen,
    departmentLabel: string,
    departmentId: string | null,
    moduleLabel?: string,
  ) => {
    if (seen.has(screen.href)) return;
    seen.add(screen.href);
    const context = moduleLabel
      ? `${departmentLabel} › ${moduleLabel}`
      : departmentLabel;
    results.push({
      id: screen.id,
      label: screen.label,
      href: screen.href,
      context,
      departmentId,
      normalizedLabel: normalizeSearchText(`${screen.label} ${context}`),
    });
  };

  if (nav.master) {
    push(
      {
        id: nav.master.id,
        label: nav.master.label,
        href: nav.master.href,
        icon: nav.master.icon,
        item: nav.master.item,
        pathPrefix: nav.master.pathPrefix,
      },
      "Dashboard Master",
      null,
    );
  }

  if (nav.executive) {
    push(
      {
        id: nav.executive.id,
        label: nav.executive.label,
        href: nav.executive.href,
        icon: nav.executive.icon,
        item: nav.executive.item,
        pathPrefix: nav.executive.pathPrefix,
      },
      "Dashboard Executivo",
      null,
    );
  }

  for (const dept of nav.departments) {
    for (const mod of Object.values(dept.modules)) {
      for (const screen of mod.screens) {
        push(screen, dept.label, dept.id, mod.label);
      }
    }
  }

  if (nav.system) {
    for (const mod of Object.values(nav.system.modules)) {
      for (const screen of mod.screens) {
        push(screen, nav.system.label, nav.system.id, mod.label);
      }
    }
  }

  return results;
}

export function buildCup360NavSearchIndex(nav: Cup360NavV3): Cup360NavSearchResult[] {
  return buildScreenIndex(nav);
}

export function searchCup360Navigation(
  nav: Cup360NavV3,
  query: string,
  limit = 12,
): Cup360NavSearchResult[] {
  const q = normalizeSearchText(query);
  if (!q) return [];

  const index = buildScreenIndex(nav);
  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = index
    .map((entry) => {
      let score = 0;
      const labelNorm = normalizeSearchText(entry.label);
      const contextNorm = normalizeSearchText(entry.context);

      if (labelNorm === q) score += 100;
      if (labelNorm.startsWith(q)) score += 60;
      if (labelNorm.includes(q)) score += 40;
      if (contextNorm.includes(q)) score += 20;
      if (entry.normalizedLabel.includes(q)) score += 15;

      for (const token of tokens) {
        if (labelNorm.includes(token)) score += 10;
        if (contextNorm.includes(token)) score += 5;
      }

      return { entry, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label, "pt-BR"));

  return scored.slice(0, limit).map((x) => x.entry);
}

export function filterAuthorizedSearchResults(
  results: Cup360NavSearchResult[],
  authorizedHrefs: Set<string>,
): Cup360NavSearchResult[] {
  return results.filter((r) => authorizedHrefs.has(r.href));
}
