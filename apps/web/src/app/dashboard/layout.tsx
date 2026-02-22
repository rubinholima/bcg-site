import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { DashboardHead } from "@/components/dashboard/DashboardHead";
import { DashboardGuard } from "@/components/auth/DashboardGuard";
import { DashboardBodyLock } from "@/components/dashboard/DashboardBodyLock";
import { buildBackendUrl } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const res = await fetch(buildBackendUrl("/group"), { cache: "no-store" });
    if (!res.ok) return {};
    const group = (await res.json()) as { name?: string | null; logoUrl?: string | null };
    const name = group?.name ?? "Boston City Group";
    return {
      title: `Dashboard · ${name}`,
      icons: {
        icon: [{ url: "/bcg-logo.png", type: "image/png", sizes: "32x32" }, { url: "/bcg-logo.png", type: "image/png", sizes: "192x192" }],
        shortcut: "/bcg-logo.png",
        apple: "/bcg-logo.png",
      },
    };
  } catch {
    return { title: "Dashboard" };
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <DashboardBodyLock />
      <DashboardHead />
      <div className="flex h-screen w-full min-w-0 overflow-clip">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <Sidebar />
        </aside>

        {/* Main Content - flex-basis:0 força o item a não ultrapassar o espaço disponível */}
        <div className="flex min-h-0 min-w-0 flex-[1_1_0%] flex-col overflow-clip">
          {/* Header */}
          <Header />

          {/* Page Content - scroll contido para não passar do rodapé */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-clip bg-background px-4 pb-6 pt-0 sm:px-6">
            <div className="dashboard-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overscroll-none bg-background">
              <div className="min-w-0 max-w-full pr-6">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </DashboardGuard>
  );
}
