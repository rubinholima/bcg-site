"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function DashboardGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, loading, canAccessDashboard, mustChangePassword } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = pathname ? `/login?next=${encodeURIComponent(pathname)}` : "/login";
      router.replace(next);
      return;
    }
    if (mustChangePassword) {
      router.replace(`/change-password?next=${encodeURIComponent(pathname || "/dashboard")}`);
      return;
    }
    if (!canAccessDashboard) {
      router.replace("/");
      return;
    }
  }, [loading, user, canAccessDashboard, mustChangePassword, router, pathname]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  if (!user || !canAccessDashboard || mustChangePassword) {
    return null;
  }
  return <>{children}</>;
}
