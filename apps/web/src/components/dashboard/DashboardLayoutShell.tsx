"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { DashboardShellProvider, useDashboardShell } from "@/context/DashboardShellContext";
import { DashboardThemeProvider, useDashboardTheme } from "@/context/DashboardThemeContext";
import { DashboardPageFrame } from "@/components/dashboard/DashboardPageFrame";
import { TenantWorkspaceRail } from "@/components/dashboard/TenantWorkspaceBackdrop";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isSessaoPage = pathname.includes("/consultas/sessao");
  const isControleHallPage = pathname.includes("/marketing/boston-tv/controle-hall");
  const isAcademiasEmbed = pathname.startsWith("/dashboard/academias/");
  const usePageFrame = !isSessaoPage && !isAcademiasEmbed && !isControleHallPage;
  const { sidebarOpen, closeSidebar, sidebarDesktopMode } = useDashboardShell();
  const { resolvedTheme } = useDashboardTheme();

  const desktopHidden = sidebarDesktopMode === "hidden";
  const desktopIcons = sidebarDesktopMode === "icons";

  if (isSessaoPage || isControleHallPage) {
    return (
      <div
        data-dashboard-root
        data-theme={resolvedTheme}
        suppressHydrationWarning
        className="h-[100dvh] w-full overflow-hidden bg-background"
      >
        {children}
      </div>
    );
  }

  return (
    <div
      data-dashboard-root
      data-theme={resolvedTheme}
      suppressHydrationWarning
      className="flex h-[100dvh] w-full min-w-0 overflow-clip"
    >
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 shrink-0 transition-[width,transform] duration-200 ease-out md:static md:z-auto",
          "w-[min(100vw-2.5rem,20rem)]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          desktopHidden && "md:pointer-events-none md:w-0 md:overflow-hidden md:border-0 md:opacity-0",
          !desktopHidden && desktopIcons && "md:w-[4.5rem]",
          !desktopHidden && !desktopIcons && "md:w-80",
        )}
      >
        <Sidebar />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-[1_1_0%] flex-col overflow-clip">
        <Header />
        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-1 overflow-clip bg-background dashboard-main-bg",
            isAcademiasEmbed ? "flex-col px-1 pb-1 pt-4 sm:px-4 sm:pb-4" : "flex-row",
          )}
        >
          {!isAcademiasEmbed ? <TenantWorkspaceRail /> : null}
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-clip",
              isAcademiasEmbed ? "" : "pt-6 sm:pt-8 px-3 pb-4 sm:px-6 sm:pb-6",
            )}
          >
            <div
              className={cn(
                "dashboard-scroll min-h-0 min-w-0 flex-1 overscroll-none bg-transparent",
                isAcademiasEmbed ? "flex flex-col overflow-hidden" : "overflow-x-hidden",
              )}
            >
              <div
                className={cn(
                  "min-w-0 max-w-full",
                  isAcademiasEmbed ? "flex min-h-0 flex-1 flex-col pr-0" : "pr-0 sm:pr-6",
                )}
                data-dashboard-content
              >
                {usePageFrame ? <DashboardPageFrame>{children}</DashboardPageFrame> : children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardThemeProvider>
      <DashboardShellProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </DashboardShellProvider>
    </DashboardThemeProvider>
  );
}
