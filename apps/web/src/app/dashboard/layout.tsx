import type { Metadata } from "next";
import { DashboardLayoutShell } from "@/components/dashboard/DashboardLayoutShell";
import { DashboardHead } from "@/components/dashboard/DashboardHead";
import { DashboardGuard } from "@/components/auth/DashboardGuard";
import { DashboardBodyLock } from "@/components/dashboard/DashboardBodyLock";
import { getAppBaseUrl } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const base = getAppBaseUrl();
    const res = await fetch(`${base}/api/public/group`, { cache: "no-store" });
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
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var p=localStorage.getItem('cup360-dashboard-theme');var light=p==='light'||(p==='system'&&!window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',!light);document.documentElement.classList.toggle('dashboard-theme-light',light);}catch(e){}})();`,
        }}
      />
      <DashboardBodyLock />
      <DashboardHead />
      <DashboardLayoutShell>{children}</DashboardLayoutShell>
    </DashboardGuard>
  );
}
