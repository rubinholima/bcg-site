import type { LucideIcon } from "lucide-react";
import {
  DASHBOARD_MENU,
  type MenuItemConfig,
  canAccessMenuLeaf,
} from "./dashboard-menu.config";
import { DEPT_HUB_MENU_LABEL } from "./dashboard-labels";

export const DASHBOARD_SHORTCUT_SLOTS = 5;

export type DashboardShortcutOption = {
  href: string;
  label: string;
  icon?: LucideIcon;
  menuLogoSrc?: string;
};

function visitShortcutOptions(
  items: MenuItemConfig[],
  pathPrefix: string,
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard: boolean | undefined,
  out: DashboardShortcutOption[],
  seen: Set<string>,
) {
  for (const item of items) {
    if (item.slug === "dashboard") continue;

    if (item.href && !item.external && item.label !== DEPT_HUB_MENU_LABEL) {
      const leafPrefix = pathPrefix || item.slug;
      const allowed =
        canAccessMenuLeaf(item, leafPrefix, canAccessModule) ||
        (item.moduleSlug === "emails" && canAccessDashboard);
      if (allowed && !seen.has(item.href)) {
        seen.add(item.href);
        out.push({
          href: item.href,
          label: item.label,
          icon: item.icon,
          menuLogoSrc: item.menuLogoSrc,
        });
      }
    }

    if (item.children?.length) {
      const childPrefix = pathPrefix ? `${pathPrefix}/${item.slug}` : item.slug;
      visitShortcutOptions(item.children, childPrefix, canAccessModule, canAccessDashboard, out, seen);
    }
  }
}

/** Itens do menu que o usuário pode escolher como atalho. */
export function collectDashboardShortcutOptions(
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
): DashboardShortcutOption[] {
  const out: DashboardShortcutOption[] = [];
  const seen = new Set<string>();
  visitShortcutOptions(DASHBOARD_MENU, "", canAccessModule, canAccessDashboard, out, seen);
  return out.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

/** Mapa href → opção (para renderizar slots salvos). */
export function buildDashboardShortcutMap(
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
): Map<string, DashboardShortcutOption> {
  const map = new Map<string, DashboardShortcutOption>();
  for (const opt of collectDashboardShortcutOptions(canAccessModule, canAccessDashboard)) {
    map.set(opt.href, opt);
  }
  return map;
}

export function normalizeShortcutSlots(raw: unknown): (string | null)[] {
  const empty = Array.from({ length: DASHBOARD_SHORTCUT_SLOTS }, () => null as string | null);
  if (!Array.isArray(raw)) return empty;
  return empty.map((_, i) => {
    const v = raw[i];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  });
}
