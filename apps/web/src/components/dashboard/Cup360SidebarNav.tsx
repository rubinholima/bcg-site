"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useDashboardShell } from "@/context/DashboardShellContext";
import { getDashboardHomeMenuItem, getHomeDashboardRoute } from "@/lib/dashboard-home";
import {
  buildCup360NavTree,
  findActiveNavContext,
} from "@/lib/cup360-nav-build";
import type {
  ResolvedNavArea,
  ResolvedNavModule,
  ResolvedNavScreen,
} from "@/lib/cup360-nav-resolve";
import { cup360 } from "@/lib/cup360-design-tokens";
import { SidebarAreaLabel } from "@/components/dashboard/cup360";

function NavIcon({
  icon: Icon,
  menuLogoSrc,
  className,
}: {
  icon?: ResolvedNavScreen["icon"];
  menuLogoSrc?: string;
  className?: string;
}) {
  if (menuLogoSrc) {
    return (
      <img
        src={menuLogoSrc}
        alt=""
        className={cn("shrink-0 rounded-full object-contain", className)}
      />
    );
  }
  if (!Icon) return <span className={cn("shrink-0", className)} />;
  return <Icon className={cn("shrink-0", className)} />;
}

function isScreenActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (href !== "/dashboard" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

function areaIsActive(area: ResolvedNavArea, pathname: string | null): boolean {
  return area.modules.some((m) => m.screens.some((s) => isScreenActive(s.href, pathname)));
}

export function Cup360SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { canAccessModule, canAccessDashboard, role, modules, isSuperAdmin } = useAuth();
  const { onNavClick } = useDashboardShell();

  const homeRoute = getHomeDashboardRoute(role, modules);
  const homeMenu = getDashboardHomeMenuItem(role, modules);

  const { executive, areas } = useMemo(
    () =>
      buildCup360NavTree(
        canAccessModule,
        canAccessDashboard,
        isSuperAdmin,
      ),
    [canAccessModule, canAccessDashboard, isSuperAdmin],
  );

  const activeCtx = useMemo(
    () => findActiveNavContext(pathname, areas, executive),
    [pathname, areas, executive],
  );

  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [collapsedFlyoutAreaId, setCollapsedFlyoutAreaId] = useState<string | null>(null);

  useEffect(() => {
    if (activeCtx.executiveActive) {
      setExpandedAreaId(null);
      setExpandedModuleId(null);
      return;
    }
    if (activeCtx.areaId) {
      setExpandedAreaId(activeCtx.areaId);
      setExpandedModuleId(activeCtx.moduleId);
    }
  }, [activeCtx.areaId, activeCtx.moduleId, activeCtx.executiveActive, pathname]);

  useEffect(() => {
    if (!collapsed) setCollapsedFlyoutAreaId(null);
  }, [collapsed]);

  const toggleArea = (areaId: string) => {
    setExpandedAreaId((prev) => {
      if (prev === areaId) return null;
      return areaId;
    });
    setExpandedModuleId(null);
  };

  const toggleModule = (areaId: string, moduleId: string) => {
    setExpandedAreaId(areaId);
    setExpandedModuleId((prev) => (prev === moduleId ? null : moduleId));
  };

  const showHome =
    canAccessDashboard &&
    homeMenu.href &&
    homeMenu.href !== executive?.href;

  return (
    <nav className={cup360.sidebar.nav} aria-label="Navegação principal">
      {showHome ? (
        <Link
          href={homeRoute}
          onClick={onNavClick}
          title={collapsed ? homeMenu.label : undefined}
          className={cn(
            cup360.sidebar.linkL1,
            "h-[38px]",
            collapsed && "justify-center px-1.5",
            pathname === homeMenu.href || pathname?.startsWith(`${homeMenu.href}/`)
              ? cup360.sidebar.active
              : cup360.sidebar.idle,
          )}
        >
          <LayoutDashboard className={cup360.sidebar.iconL1} />
          {!collapsed ? (
            <span className="min-w-0 truncate">{homeMenu.label}</span>
          ) : null}
        </Link>
      ) : null}

      {executive ? (
        <Link
          href={executive.href}
          onClick={onNavClick}
          title={collapsed ? executive.label : undefined}
          className={cn(
            cup360.sidebar.executiveLink,
            collapsed && "justify-center px-1.5",
            activeCtx.executiveActive ? cup360.sidebar.active : cup360.sidebar.idle,
          )}
        >
          <NavIcon
            icon={executive.icon}
            menuLogoSrc={executive.menuLogoSrc}
            className={cup360.sidebar.iconL1}
          />
          {!collapsed ? (
            <span className="min-w-0 truncate font-semibold">{executive.label}</span>
          ) : null}
        </Link>
      ) : null}

      {areas.map((area) => {
        const areaActive = areaIsActive(area, pathname);

        if (collapsed) {
          return (
            <CollapsedAreaFlyout
              key={area.id}
              area={area}
              pathname={pathname}
              areaActive={areaActive}
              flyoutOpen={collapsedFlyoutAreaId === area.id}
              onFlyoutOpenChange={(open) =>
                setCollapsedFlyoutAreaId(open ? area.id : null)
              }
              onNavigate={onNavClick}
            />
          );
        }

        const areaOpen = expandedAreaId === area.id;

        return (
          <div key={area.id} className="min-w-0">
            <button
              type="button"
              onClick={() => toggleArea(area.id)}
              className={cn(
                cup360.sidebar.areaToggle,
                areaActive && !areaOpen && "text-foreground",
              )}
            >
              {areaOpen ? (
                <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
              )}
              <SidebarAreaLabel label={area.label} className="py-0 pt-0" />
            </button>

            {areaOpen ? (
              <div className={cup360.sidebar.moduleList}>
                {area.modules.map((mod) => (
                  <ModuleBlock
                    key={mod.id}
                    mod={mod}
                    pathname={pathname}
                    expanded={expandedModuleId === mod.id}
                    onToggle={() => toggleModule(area.id, mod.id)}
                    onNavigate={onNavClick}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function CollapsedAreaFlyout({
  area,
  pathname,
  areaActive,
  flyoutOpen,
  onFlyoutOpenChange,
  onNavigate,
}: {
  area: ResolvedNavArea;
  pathname: string | null;
  areaActive: boolean;
  flyoutOpen: boolean;
  onFlyoutOpenChange: (open: boolean) => void;
  onNavigate: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const AreaIcon = area.icon;

  useEffect(() => {
    if (!flyoutOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      onFlyoutOpenChange(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [flyoutOpen, onFlyoutOpenChange]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => onFlyoutOpenChange(true)}
      onMouseLeave={() => onFlyoutOpenChange(false)}
    >
      <button
        type="button"
        aria-expanded={flyoutOpen}
        aria-haspopup="true"
        title={area.label}
        onClick={() => onFlyoutOpenChange(!flyoutOpen)}
        className={cn(
          cup360.sidebar.linkL1,
          "h-[38px] w-full justify-center px-1.5",
          areaActive ? cup360.sidebar.active : cup360.sidebar.idle,
        )}
      >
        {AreaIcon ? (
          <AreaIcon className={cup360.sidebar.iconL1} />
        ) : (
          <span className="text-[10px] font-bold uppercase">{area.label.slice(0, 2)}</span>
        )}
      </button>

      {flyoutOpen ? (
        <div className={cup360.sidebar.flyout} role="menu" aria-label={area.label}>
          <div className={cup360.sidebar.flyoutTitle}>{area.label}</div>
          <div className={cup360.sidebar.flyoutScroll}>
            {area.modules.map((mod) => (
              <CollapsedFlyoutModule
                key={mod.id}
                mod={mod}
                pathname={pathname}
                onNavigate={() => {
                  onNavigate();
                  onFlyoutOpenChange(false);
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CollapsedFlyoutModule({
  mod,
  pathname,
  onNavigate,
}: {
  mod: ResolvedNavModule;
  pathname: string | null;
  onNavigate: () => void;
}) {
  const single = mod.screens.length === 1;
  const modActive = mod.screens.some((s) => isScreenActive(s.href, pathname));

  if (single) {
    const only = mod.screens[0]!;
    return (
      <Link
        href={only.href}
        onClick={onNavigate}
        role="menuitem"
        className={cn(
          cup360.sidebar.flyoutLink,
          "mx-1",
          isScreenActive(only.href, pathname) ? cup360.sidebar.active : cup360.sidebar.idle,
        )}
      >
        <span className="min-w-0 truncate">{mod.label}</span>
      </Link>
    );
  }

  return (
    <div className="min-w-0">
      <div
        className={cn(
          cup360.sidebar.flyoutModule,
          modActive && "text-foreground",
        )}
      >
        {mod.label}
      </div>
      {mod.screens.map((screen) => (
        <Link
          key={screen.id}
          href={screen.href}
          onClick={onNavigate}
          role="menuitem"
          className={cn(
            cup360.sidebar.flyoutLink,
            "mx-1 pl-3.5",
            isScreenActive(screen.href, pathname)
              ? cup360.sidebar.active
              : cup360.sidebar.idle,
          )}
        >
          <span className="min-w-0 truncate">{screen.label}</span>
        </Link>
      ))}
    </div>
  );
}

function ModuleBlock({
  mod,
  pathname,
  expanded,
  onToggle,
  onNavigate,
}: {
  mod: ResolvedNavModule;
  pathname: string | null;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const single = mod.screens.length === 1;
  const only = mod.screens[0]!;
  const modActive = mod.screens.some((s) => isScreenActive(s.href, pathname));

  if (single) {
    return (
      <Link
        href={only.href}
        onClick={onNavigate}
        className={cn(
          cup360.sidebar.linkL2,
          "h-[34px]",
          isScreenActive(only.href, pathname) ? cup360.sidebar.active : cup360.sidebar.idle,
        )}
      >
        <NavIcon icon={only.icon} menuLogoSrc={only.menuLogoSrc} className={cup360.sidebar.iconL2} />
        <span className="min-w-0 truncate">{mod.label}</span>
      </Link>
    );
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          cup360.sidebar.linkL2,
          "h-[34px] w-full",
          modActive && !expanded ? cup360.sidebar.activeSoft : cup360.sidebar.idle,
        )}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
        )}
        <NavIcon icon={mod.icon ?? mod.screens[0]?.icon} className={cup360.sidebar.iconL2} />
        <span className="min-w-0 truncate text-left">{mod.label}</span>
      </button>
      {expanded ? (
        <div className={cup360.sidebar.screenList}>
          {mod.screens.map((screen) => (
            <Link
              key={screen.id}
              href={screen.href}
              onClick={onNavigate}
              className={cn(
                cup360.sidebar.linkL3,
                "h-[31px]",
                isScreenActive(screen.href, pathname)
                  ? cup360.sidebar.active
                  : cup360.sidebar.idle,
              )}
            >
              <span className="min-w-0 truncate">{screen.label}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
