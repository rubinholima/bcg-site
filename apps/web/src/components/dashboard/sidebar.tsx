"use client";

import { Suspense } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useDashboardShell } from "@/context/DashboardShellContext";
import { getHomeDashboardRoute } from "@/lib/dashboard-home";
import { useAuth } from "@/context/AuthContext";
import { Cup360BrandMark } from "@/components/dashboard/Cup360BrandMark";
import { DashboardThemeToggle } from "@/components/dashboard/DashboardThemeToggle";
import { Cup360SidebarNav } from "@/components/dashboard/Cup360SidebarNav";
import { PLATFORM_APP_NAME } from "@/lib/platform-branding";
import { cup360 } from "@/lib/cup360-design-tokens";

function SidebarFrame() {
  const { role, modules } = useAuth();
  const { onNavClick, sidebarDesktopMode } = useDashboardShell();
  const collapsed = sidebarDesktopMode === "icons";
  const homeRoute = getHomeDashboardRoute(role, modules);

  return (
    <div className="relative flex h-full flex-col border-r border-border bg-card shadow-sm">
      <div
        className={cn(
          "hidden h-14 shrink-0 items-center justify-center border-b border-border lg:flex",
          collapsed ? "px-1.5" : "px-2",
        )}
      >
        <Link
          href={homeRoute}
          className="flex w-full min-w-0 items-center justify-center"
          onClick={onNavClick}
          title={collapsed ? PLATFORM_APP_NAME : undefined}
        >
          <Cup360BrandMark
            logoClassName={collapsed ? "h-10 w-10" : "h-9 w-9"}
            showName={!collapsed}
            nameClassName="text-lg font-bold tracking-tight"
          />
        </Link>
      </div>

      <Cup360SidebarNav collapsed={collapsed} />

      <div
        className={cn(
          "shrink-0 border-t border-border p-2",
          collapsed ? "flex justify-center" : "px-2",
        )}
      >
        <DashboardThemeToggle
          compact={collapsed}
          fullWidth={!collapsed}
          className={collapsed ? undefined : "w-full"}
        />
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <Suspense
      fallback={
        <div
          className={cn("flex h-full border-r border-border bg-card", cup360.layout.sidebarOpen)}
        />
      }
    >
      <SidebarFrame />
    </Suspense>
  );
}
