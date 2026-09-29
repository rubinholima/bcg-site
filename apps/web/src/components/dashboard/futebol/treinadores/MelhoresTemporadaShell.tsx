"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2 } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";
import { TreinadoresFilters } from "./TreinadoresFilters";
import { canAccessMelhoresTemporada } from "./treinadores-access";

interface MelhoresTemporadaShellProps {
  children: ReactNode;
}

export function MelhoresTemporadaShell({ children }: MelhoresTemporadaShellProps) {
  const router = useRouter();
  const { canAccessModule, role, modules, loading } = useAuth();
  const canEnter = canAccessMelhoresTemporada(role, modules, canAccessModule);

  useEffect(() => {
    if (!loading && !canEnter) {
      router.replace("/403");
    }
  }, [canEnter, loading, router]);

  if (loading || !canEnter) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Depto de Futebol · Treinadores"
        sectionIcon={ClipboardList}
        title="Melhores da Temporada"
        backHref="/dashboard/futebol"
        backLabel="Depto de Futebol"
      />
      <TreinadoresFilters />
      {children}
    </div>
  );
}
