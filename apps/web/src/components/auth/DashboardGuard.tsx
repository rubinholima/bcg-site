"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function DashboardGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, loading, canAccessDashboard } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = pathname ? `/login?next=${encodeURIComponent(pathname)}` : "/login";
      router.replace(next);
      return;
    }
    if (!canAccessDashboard) {
      router.replace("/");
      return;
    }
  }, [loading, user, canAccessDashboard, router, pathname]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  if (!user || !canAccessDashboard) {
    return null;
  }
  return <>{children}</>;
}
