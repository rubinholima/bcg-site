"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";

interface FisiologiaShellProps {
  title: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function FisiologiaShell({
  title,
  children,
  backHref = "/dashboard/futebol/fisiologia",
  backLabel = "Fisiologia",
}: FisiologiaShellProps) {
  const router = useRouter();
  const { canAccessModule, isCompanyAdmin, isSuperAdmin, loading } = useAuth();
  const canAccess = isSuperAdmin || isCompanyAdmin || canAccessModule("futebol_fisiologia");

  useEffect(() => {
    if (!loading && !canAccess) router.replace("/403");
  }, [loading, canAccess, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  if (!canAccess) return null;

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Depto Futebol · Performance"
        sectionIcon={Heart}
        title={title}
        backHref={backHref}
        backLabel={backLabel}
        accent="sky"
      />
      {children}
    </div>
  );
}
