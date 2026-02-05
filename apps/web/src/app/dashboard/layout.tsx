import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { DashboardHead } from "@/components/dashboard/DashboardHead";
import { DashboardGuard } from "@/components/auth/DashboardGuard";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const res = await fetch(`${apiUrl}/group`, { cache: "no-store" });
    if (!res.ok) return {};
    const group = (await res.json()) as { name?: string | null; logoUrl?: string | null };
    const name = group?.name ?? "Boston City Group";
    return {
      title: `Dashboard · ${name}`,
      icons: group?.logoUrl ? { icon: group.logoUrl } : undefined,
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
      <DashboardHead />
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Header */}
          <Header />

          {/* Page Content - único scroll */}
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardGuard>
  );
}
