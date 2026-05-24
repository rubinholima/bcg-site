"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { DashboardShellProvider, useDashboardShell } from "@/context/DashboardShellContext";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isSessaoPage = pathname.includes("/consultas/sessao");
  const isAcademiasEmbed = pathname.startsWith("/dashboard/academias/");
  const { sidebarOpen, closeSidebar } = useDashboardShell();

  if (isSessaoPage) {
    return (
      <div className="h-[100dvh] w-full overflow-auto bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full min-w-0 overflow-clip">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(100vw-2.5rem,16rem)] shrink-0 transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-64 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <Sidebar />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-[1_1_0%] flex-col overflow-clip">
        <Header />
        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-clip bg-background pt-0 dashboard-main-bg",
            isAcademiasEmbed ? "px-1 pb-1 sm:px-4 sm:pb-4" : "px-3 pb-4 sm:px-6 sm:pb-6",
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
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShellProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </DashboardShellProvider>
  );
}
