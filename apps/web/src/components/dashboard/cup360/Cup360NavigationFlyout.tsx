"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardShell } from "@/context/DashboardShellContext";
import {
  getFlyoutView,
  type Cup360NavV3,
  type ResolvedFlyoutGroup,
} from "@/lib/cup360-nav-build";
import { cup360 } from "@/lib/cup360-design-tokens";

function isScreenActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (href !== "/dashboard" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

function FlyoutGroups({
  groups,
  columns,
  pathname,
  onNavigate,
  onOpenModule,
}: {
  groups: ResolvedFlyoutGroup[];
  columns: 1 | 2;
  pathname: string | null;
  onNavigate: () => void;
  onOpenModule: (moduleId: string) => void;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 px-3 pb-4 pt-1",
        columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
      )}
    >
      {groups.map((group) => (
        <div key={group.id} className="min-w-0">
          <div className={cup360.sidebar.flyoutGroupLabel}>{group.label}</div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              if (item.kind === "link") {
                const active = isScreenActive(item.screen.href, pathname);
                return (
                  <Link
                    key={item.screen.id}
                    href={item.screen.href}
                    onClick={onNavigate}
                    className={cn(
                      cup360.sidebar.flyoutLink,
                      active ? cup360.sidebar.active : "text-foreground/90",
                    )}
                  >
                    <span className="min-w-0 truncate">{item.screen.label}</span>
                  </Link>
                );
              }
              return (
                <button
                  key={item.moduleId}
                  type="button"
                  onClick={() => onOpenModule(item.moduleId)}
                  className={cn(cup360.sidebar.flyoutModuleBtn, "text-foreground/90")}
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Cup360NavigationFlyout({
  nav,
  sidebarLeftPx,
  headerHeightPx = 56,
}: {
  nav: Cup360NavV3;
  sidebarLeftPx: number;
  headerHeightPx?: number;
}) {
  const pathname = usePathname();
  const {
    navFlyoutOpen,
    navFlyoutDepartmentId,
    navFlyoutModuleStack,
    closeNavFlyout,
    pushNavFlyoutModule,
    popNavFlyoutModule,
    onNavClick,
  } = useDashboardShell();

  const moduleContextId =
    navFlyoutModuleStack.length > 0
      ? navFlyoutModuleStack[navFlyoutModuleStack.length - 1]!
      : null;

  const view = useMemo(() => {
    if (!navFlyoutOpen || !navFlyoutDepartmentId) return null;
    return getFlyoutView(nav, navFlyoutDepartmentId, moduleContextId);
  }, [nav, navFlyoutOpen, navFlyoutDepartmentId, moduleContextId]);

  useEffect(() => {
    if (!navFlyoutOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNavFlyout();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navFlyoutOpen, closeNavFlyout]);

  if (!navFlyoutOpen || !view) return null;

  const handleNavigate = () => {
    onNavClick();
    closeNavFlyout();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Fechar navegação contextual"
        className="fixed inset-0 z-[44] bg-black/20"
        onClick={closeNavFlyout}
      />
      <aside
        className={cup360.sidebar.flyoutPanel}
        style={{
          left: sidebarLeftPx + 8,
          top: headerHeightPx + 8,
          width: `min(720px, calc(100vw - ${sidebarLeftPx + 24}px))`,
          maxHeight: `calc(100vh - ${headerHeightPx + 16}px)`,
        }}
        aria-label={`Navegação ${view.breadcrumb.areaLabel}`}
      >
        <header className={cup360.sidebar.flyoutHeader}>
          <div className="min-w-0">
            {moduleContextId ? (
              <button
                type="button"
                onClick={popNavFlyoutModule}
                className={cup360.sidebar.flyoutBack}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {view.breadcrumb.areaLabel}
              </button>
            ) : null}
            <h2 className={cup360.sidebar.flyoutTitle}>
              {view.moduleContext?.label ?? view.breadcrumb.areaLabel}
            </h2>
            {view.department.subtitle && !moduleContextId ? (
              <p className={cup360.sidebar.flyoutSubtitle}>{view.department.subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={closeNavFlyout}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <FlyoutGroups
            groups={view.groups}
            columns={view.columns}
            pathname={pathname}
            onNavigate={handleNavigate}
            onOpenModule={pushNavFlyoutModule}
          />
        </div>
      </aside>
    </>
  );
}
