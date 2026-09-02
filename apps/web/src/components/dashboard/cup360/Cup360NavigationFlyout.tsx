"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardShell } from "@/context/DashboardShellContext";
import {
  getFlyoutView,
  type Cup360NavV3,
  type ResolvedFlyoutGroup,
  type ResolvedFlyoutLink,
  type ResolvedFlyoutModule,
} from "@/lib/cup360-nav-build";
import { cup360 } from "@/lib/cup360-design-tokens";

const HEADER_HEIGHT_PX = 64;

function isScreenActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (href !== "/dashboard" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

function flyoutWidthPx(sidebarLeftPx: number): number {
  const available = typeof window !== "undefined" ? window.innerWidth - sidebarLeftPx - 16 : 880;
  return Math.min(880, Math.max(720, Math.min(available, 880)));
}

type FlyoutGroupsProps = {
  groups: ResolvedFlyoutGroup[];
  columns: 1 | 2;
  pathname: string | null;
  moduleContext: boolean;
  onNavigate: (href: string) => void;
  onOpenModule: (moduleId: string) => void;
};

function FlyoutTile({
  title,
  subtitle,
  icon: Icon,
  active,
  onClick,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        cup360.sidebar.flyoutTile,
        active ? cup360.sidebar.flyoutTileActive : cup360.sidebar.flyoutTileIdle,
      )}
    >
      {Icon ? (
        <span className={cup360.sidebar.flyoutTileIcon}>
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[13px] font-medium leading-tight">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
    </button>
  );
}

function FlyoutContextLink({
  item,
  pathname,
  onNavigate,
}: {
  item: ResolvedFlyoutLink;
  pathname: string | null;
  onNavigate: (href: string) => void;
}) {
  const active = isScreenActive(item.screen.href, pathname);
  const Icon = item.screen.icon;
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.screen.href)}
      className={cn(
        cup360.sidebar.flyoutContextLink,
        active ? cup360.sidebar.flyoutTileActive : cup360.sidebar.flyoutContextLinkIdle,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" /> : null}
      <span className="min-w-0 truncate">{item.screen.label}</span>
    </button>
  );
}

function FlyoutGroups({
  groups,
  columns,
  pathname,
  moduleContext,
  onNavigate,
  onOpenModule,
}: FlyoutGroupsProps) {
  if (moduleContext) {
    return (
      <div
        className={cn(
          "grid gap-x-6 gap-y-4 px-5 pb-6 pt-2",
          columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
        )}
      >
        {groups.map((group) => (
          <div key={group.id} className="min-w-0">
            <div className={cup360.sidebar.flyoutGroupLabel}>{group.label}</div>
            <div className="mt-1 space-y-0.5">
              {group.items.map((item) => {
                if (item.kind === "link") {
                  return (
                    <FlyoutContextLink
                      key={item.screen.id}
                      item={item}
                      pathname={pathname}
                      onNavigate={onNavigate}
                    />
                  );
                }
                return (
                  <FlyoutTile
                    key={item.moduleId}
                    title={item.label}
                    onClick={() => onOpenModule(item.moduleId)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 px-5 pb-6 pt-2">
      {groups.map((group) => (
        <div key={group.id}>
          <div className={cup360.sidebar.flyoutGroupLabel}>{group.label}</div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => {
              if (item.kind === "link") {
                const active = isScreenActive(item.screen.href, pathname);
                return (
                  <FlyoutTile
                    key={item.screen.id}
                    title={item.screen.label}
                    icon={item.screen.icon}
                    active={active}
                    onClick={() => onNavigate(item.screen.href)}
                  />
                );
              }
              const mod = item as ResolvedFlyoutModule;
              return (
                <FlyoutTile
                  key={mod.moduleId}
                  title={mod.label}
                  subtitle={mod.screenCount > 1 ? `${mod.screenCount} telas` : undefined}
                  onClick={() => onOpenModule(mod.moduleId)}
                />
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
  headerHeightPx = HEADER_HEIGHT_PX,
}: {
  nav: Cup360NavV3;
  sidebarLeftPx: number;
  headerHeightPx?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const [mounted, setMounted] = useState(false);
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
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname;
      closeNavFlyout();
    }
  }, [pathname, closeNavFlyout]);

  useEffect(() => {
    if (!navFlyoutOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNavFlyout();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navFlyoutOpen, closeNavFlyout]);

  const handleNavigate = useCallback(
    (href: string) => {
      onNavClick();
      router.push(href);
    },
    [onNavClick, router],
  );

  if (!mounted || !navFlyoutOpen || !view) return null;

  const panelWidth = flyoutWidthPx(sidebarLeftPx);

  const content = (
    <>
      <div
        role="presentation"
        aria-hidden
        className={cup360.sidebar.flyoutScrim}
        style={{
          left: sidebarLeftPx,
          top: headerHeightPx,
        }}
        onClick={closeNavFlyout}
      />
      <aside
        className={cup360.sidebar.flyoutPanel}
        style={{
          left: sidebarLeftPx,
          top: headerHeightPx,
          width: panelWidth,
          height: `calc(100vh - ${headerHeightPx}px)`,
        }}
        aria-label={`Navegação ${view.breadcrumb.areaLabel}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={cup360.sidebar.flyoutHeader}>
          <div className="min-w-0 flex-1">
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
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className={cup360.sidebar.flyoutBody}>
          <FlyoutGroups
            groups={view.groups}
            columns={view.columns}
            pathname={pathname}
            moduleContext={!!moduleContextId}
            onNavigate={handleNavigate}
            onOpenModule={pushNavFlyoutModule}
          />
        </div>
      </aside>
    </>
  );

  return createPortal(content, document.body);
}
