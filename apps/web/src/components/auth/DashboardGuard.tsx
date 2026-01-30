"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function DashboardGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, role, loading, canAccessDashboard } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!canAccessDashboard) {
      router.replace("/");
      return;
    }
  }, [loading, user, canAccessDashboard, router]);

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
