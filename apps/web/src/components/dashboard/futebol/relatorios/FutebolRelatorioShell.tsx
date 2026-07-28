"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Map as MapIcon } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";

interface FutebolRelatorioShellProps {
  title: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function FutebolRelatorioShell({
  title,
  children,
  backHref = "/dashboard/futebol/logistica",
  backLabel = "Logística",
}: FutebolRelatorioShellProps) {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();

  const canAccess =
    canAccessModule("futebol_logistica") || canAccessModule("relatorios_futebol");

  useEffect(() => {
    if (!loading && !canAccess) {
      router.replace("/403");
    }
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
        section="Logística"
        sectionIcon={MapIcon}
        title={title}
        backHref={backHref}
        backLabel={backLabel}
      />
      {children}
    </div>
  );
}
