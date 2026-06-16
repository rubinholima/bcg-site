"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CircleHelp, Home, Menu, PanelLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDashboardShell } from "@/context/DashboardShellContext";
import { Cup360BrandMark } from "@/components/dashboard/Cup360BrandMark";
import { DashboardHeaderShortcuts } from "@/components/dashboard/DashboardUserShortcuts";
import { resolveDashboardHeaderBreadcrumb } from "@/lib/dashboard-page-meta";

export function Header() {
  const pathname = usePathname() ?? "";
  const { hub, page } = resolveDashboardHeaderBreadcrumb(pathname);
  const { user } = useAuth();
  const { sidebarOpen, toggleSidebar, sidebarDesktopMode, cycleSidebarDesktopMode } = useDashboardShell();

  const sidebarModeTitle =
    sidebarDesktopMode === "expanded"
      ? "Menu expandido — clique para só ícones"
      : sidebarDesktopMode === "icons"
        ? "Menu só ícones — clique para ocultar"
        : "Menu oculto — clique para expandir";

  const SidebarModeIcon =
    sidebarDesktopMode === "hidden" ? PanelLeft : sidebarDesktopMode === "icons" ? PanelLeftOpen : PanelLeft;

  const displayUser = user?.name?.trim() || user?.email || "Usuário";

  return (
    <header className="flex h-14 min-w-0 items-center justify-between gap-2 border-b border-border bg-card/95 px-3 backdrop-blur-sm shadow-sm sm:h-16 sm:gap-3 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 lg:hidden"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
        <Cup360BrandMark logoClassName="h-7 w-7 shrink-0 sm:h-8 sm:w-8" showName={false} />
        <span className="hidden min-w-0 max-w-[9rem] truncate text-sm font-semibold tracking-tight sm:inline md:max-w-[12rem] md:text-base lg:max-w-xs lg:text-lg">
          <span className="font-medium text-muted-foreground">{hub}</span>
          {page ? (
            <>
              <span className="mx-1 text-foreground">·</span>
              <span className="text-foreground">{page}</span>
            </>
          ) : null}
        </span>
        <span className="hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden />
        <DashboardHeaderShortcuts />
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground lg:inline-flex"
          title={sidebarModeTitle}
          aria-label={sidebarModeTitle}
          onClick={cycleSidebarDesktopMode}
        >
          <SidebarModeIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          title="Manual da plataforma"
        >
          <Link href="/dashboard/manual" aria-label="Abrir manual da plataforma">
            <CircleHelp className="h-5 w-5" />
          </Link>
        </Button>
        <Button
          variant="outline"
          size="icon"
          asChild
          className="h-9 w-9 shrink-0 sm:h-9 sm:w-auto sm:px-3"
        >
          <a href="/" target="_blank" rel="noopener noreferrer" title="Abrir home do grupo em nova aba">
            <Home className="h-4 w-4" />
            <span className="hidden sm:ml-1.5 sm:inline">Ver site</span>
          </a>
        </Button>
        <span
          className="hidden max-w-[140px] truncate text-sm text-muted-foreground md:inline"
          title={displayUser}
        >
          {displayUser}
        </span>
        <Button variant="ghost" size="sm" asChild className="px-2 text-xs sm:text-sm">
          <a href="/api/auth/logout">Sair</a>
        </Button>
        <Button variant="outline" size="sm" asChild className="hidden px-2 sm:inline-flex">
          <Link href="/dashboard">Início</Link>
        </Button>
      </div>
    </header>
  );
}
