"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isSessaoPage = pathname.includes("/consultas/sessao");
  const isAcademiasEmbed = pathname.startsWith("/dashboard/academias/");

  if (isSessaoPage) {
    return (
      <div className="h-screen w-full overflow-auto bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full min-w-0 overflow-clip">
      <aside className="w-64 shrink-0">
        <Sidebar />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-[1_1_0%] flex-col overflow-clip">
        <Header />
        <main
          className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-clip bg-background pt-0 dashboard-main-bg ${
            isAcademiasEmbed ? "px-2 pb-2 sm:px-4 sm:pb-4" : "px-4 pb-6 sm:px-6"
          }`}
        >
          <div
            className={`dashboard-scroll min-h-0 min-w-0 flex-1 overscroll-none bg-transparent ${
              isAcademiasEmbed ? "flex flex-col overflow-hidden" : "overflow-x-hidden"
            }`}
          >
            <div
              className={`min-w-0 max-w-full ${isAcademiasEmbed ? "flex min-h-0 flex-1 flex-col pr-0" : "pr-6"}`}
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
