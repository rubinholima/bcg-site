"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";

interface FisioterapiaRelatorioShellProps {
  title: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function FisioterapiaRelatorioShell({
  title,
  children,
  backHref = "/dashboard/relatorios/saude",
  backLabel = "Relatórios",
}: FisioterapiaRelatorioShellProps) {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();

  useEffect(() => {
    if (!loading && !canAccessModule("saude")) {
      router.replace("/403");
    }
  }, [loading, canAccessModule, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!canAccessModule("saude")) return null;

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Fisioterapia"
        sectionIcon={Activity}
        title={title}
        backHref={backHref}
        backLabel={backLabel}
      />
      {children}
    </div>
  );
}
