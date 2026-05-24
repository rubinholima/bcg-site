"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { canAccessMasterDashboard, getHomeDashboardRoute } from "@/lib/dashboard-home";

export function MasterDashboardGate({ children }: { children: ReactNode }) {
  const { role, modules, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!canAccessMasterDashboard(role)) {
      router.replace(getHomeDashboardRoute(role, modules));
    }
  }, [loading, role, modules, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessMasterDashboard(role)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return children;
}
