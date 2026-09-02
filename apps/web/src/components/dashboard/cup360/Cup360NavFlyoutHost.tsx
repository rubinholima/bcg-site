"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboardShell } from "@/context/DashboardShellContext";
import { getDashboardHomeMenuItem } from "@/lib/dashboard-home";
import { buildCup360NavV3 } from "@/lib/cup360-nav-build";
import { cup360 } from "@/lib/cup360-design-tokens";
import { Cup360NavigationFlyout } from "@/components/dashboard/cup360/Cup360NavigationFlyout";

export function Cup360NavFlyoutHost() {
  const { canAccessModule, canAccessDashboard, role, modules, isSuperAdmin } = useAuth();
  const { sidebarDesktopMode } = useDashboardShell();
  const homeMenu = getDashboardHomeMenuItem(role, modules);

  const nav = useMemo(
    () =>
      buildCup360NavV3(canAccessModule, canAccessDashboard, isSuperAdmin, {
        includeMaster: canAccessDashboard,
        masterHref: homeMenu.href,
        masterLabel: homeMenu.label,
      }),
    [canAccessModule, canAccessDashboard, isSuperAdmin, homeMenu.href, homeMenu.label],
  );

  const sidebarLeftPx =
    sidebarDesktopMode === "icons"
      ? cup360.layout.sidebarCollapsedPx
      : sidebarDesktopMode === "hidden"
        ? 0
        : cup360.layout.sidebarOpenPx;

  return <Cup360NavigationFlyout nav={nav} sidebarLeftPx={sidebarLeftPx} />;
}
