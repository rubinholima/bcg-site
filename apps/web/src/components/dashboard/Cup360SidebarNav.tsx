"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useDashboardShell } from "@/context/DashboardShellContext";
import {
  canAccessMasterDashboard,
  getDashboardHomeMenuItem,
} from "@/lib/dashboard-home";
import {
  buildCup360NavV3,
  findActiveNavContextV3,
  type ResolvedDepartment,
} from "@/lib/cup360-nav-build";
import type { ResolvedNavStandalone } from "@/lib/cup360-nav-resolve";
import { cup360 } from "@/lib/cup360-design-tokens";

function SidebarRowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-[40px] w-[40px] items-center justify-center">
      <Icon className={cup360.sidebar.iconL1} />
    </span>
  );
}

function StandaloneDestination({
  item,
  collapsed,
  active,
  tag,
  onNavigate,
}: {
  item: { href: string; label: string; icon?: LucideIcon };
  collapsed: boolean;
  active: boolean;
  tag?: string;
  onNavigate: () => void;
}) {
  const Icon = item.icon ?? Settings;
  if (collapsed) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        title={item.label}
        className={cn(
          cup360.sidebar.rowGridCollapsed,
          active ? cup360.sidebar.active : cup360.sidebar.idle,
        )}
      >
        <Icon className={cup360.sidebar.iconL1} />
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(cup360.sidebar.rowGrid, active ? cup360.sidebar.active : cup360.sidebar.idle)}
    >
      <SidebarRowIcon icon={Icon} />
      <span className="min-w-0">
        <span className={cup360.sidebar.labelPrimary}>{item.label}</span>
      </span>
      <span className="flex justify-end pr-0.5">
        {tag ? <span className={cup360.sidebar.standaloneTag}>{tag}</span> : null}
      </span>
    </Link>
  );
}

function DepartmentRow({
  dept,
  collapsed,
  active,
  flyoutOpen,
  onOpen,
}: {
  dept: ResolvedDepartment;
  collapsed: boolean;
  active: boolean;
  flyoutOpen: boolean;
  onOpen: () => void;
}) {
  const Icon = dept.icon;
  if (collapsed) {
    return (
      <button
        type="button"
        title={dept.label}
        onClick={onOpen}
        className={cn(
          cup360.sidebar.rowGridCollapsed,
          active || flyoutOpen ? cup360.sidebar.active : cup360.sidebar.idle,
        )}
      >
        <Icon className={cup360.sidebar.iconL1} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={flyoutOpen}
      className={cn(
        cup360.sidebar.rowGrid,
        active || flyoutOpen ? cup360.sidebar.active : cup360.sidebar.idle,
      )}
    >
      <SidebarRowIcon icon={Icon} />
      <span className={cup360.sidebar.labelPrimary}>{dept.label}</span>
      <span className="pr-0.5" aria-hidden />
    </button>
  );
}

export function Cup360SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { canAccessModule, canAccessDashboard, role, modules, isSuperAdmin } = useAuth();
  const {
    onNavClick,
    openNavFlyout,
    navFlyoutOpen,
    navFlyoutDepartmentId,
    closeNavFlyout,
  } = useDashboardShell();

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

  const activeCtx = useMemo(
    () => findActiveNavContextV3(pathname, nav),
    [pathname, nav],
  );

  const masterItem: ResolvedNavStandalone | null = nav.master
    ? {
        ...nav.master,
        label: homeMenu.label,
        href: homeMenu.href,
        tag: canAccessMasterDashboard(role) ? "MASTER" : undefined,
      }
    : null;

  const handleDepartmentOpen = (departmentId: string) => {
    if (navFlyoutOpen && navFlyoutDepartmentId === departmentId) {
      closeNavFlyout();
      return;
    }
    openNavFlyout(departmentId);
  };

  return (
    <nav className={cup360.sidebar.nav} aria-label="Navegação principal">
      {masterItem ? (
        <StandaloneDestination
          item={{
            href: masterItem.href,
            label: masterItem.label,
            icon: masterItem.icon,
          }}
          collapsed={collapsed}
          active={activeCtx.masterActive}
          tag={masterItem.tag}
          onNavigate={onNavClick}
        />
      ) : null}

      {nav.executive ? (
        <StandaloneDestination
          item={{
            href: nav.executive.href,
            label: nav.executive.label,
            icon: nav.executive.icon,
          }}
          collapsed={collapsed}
          active={activeCtx.executiveActive}
          tag={nav.executive.tag}
          onNavigate={onNavClick}
        />
      ) : null}

      <div className={cup360.sidebar.sectionDivider} aria-hidden />

      {nav.departments.map((dept) => (
        <DepartmentRow
          key={dept.id}
          dept={dept}
          collapsed={collapsed}
          active={activeCtx.departmentId === dept.id}
          flyoutOpen={navFlyoutOpen && navFlyoutDepartmentId === dept.id}
          onOpen={() => handleDepartmentOpen(dept.id)}
        />
      ))}

      {nav.system ? (
        <>
          {!collapsed ? (
            <div className={cup360.sidebar.systemLabel}>Sistema</div>
          ) : (
            <div className={cup360.sidebar.sectionDivider} aria-hidden />
          )}
          <DepartmentRow
            dept={nav.system}
            collapsed={collapsed}
            active={activeCtx.departmentId === "sistema"}
            flyoutOpen={navFlyoutOpen && navFlyoutDepartmentId === "sistema"}
            onOpen={() => handleDepartmentOpen("sistema")}
          />
        </>
      ) : null}
    </nav>
  );
}
