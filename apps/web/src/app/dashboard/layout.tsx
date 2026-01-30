import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { DashboardHead } from "@/components/dashboard/DashboardHead";
import { DashboardGuard } from "@/components/auth/DashboardGuard";

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
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <Header />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardGuard>
  );
}
