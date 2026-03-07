"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isSessaoPage = pathname.includes("/consultas/sessao");

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
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-clip bg-background px-4 pb-6 pt-0 sm:px-6 dashboard-main-bg">
          <div className="dashboard-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overscroll-none bg-transparent">
            <div className="min-w-0 max-w-full pr-6" data-dashboard-content>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
