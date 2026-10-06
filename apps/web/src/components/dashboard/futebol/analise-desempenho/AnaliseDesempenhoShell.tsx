"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Video } from "lucide-react";
import { Cup360PageShell } from "@/components/dashboard/cup360/Cup360PageShell";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";
import { AnaliseDesempenhoFilters, useAnaliseDesempenhoQuery } from "./AnaliseDesempenhoFilters";

interface Props {
  title: string;
  children: ReactNode;
  showFilters?: boolean;
}

export function AnaliseDesempenhoShell({ title, children, showFilters = true }: Props) {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();
  const { tenantId } = useAnaliseDesempenhoQuery();

  useEffect(() => {
    if (!loading && !canAccessModule("futebol_analise_desempenho")) {
      router.replace("/403");
    }
  }, [canAccessModule, loading, router]);

  if (loading || !canAccessModule("futebol_analise_desempenho")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Cup360PageShell className="mx-auto w-full max-w-[1600px]">
      <DashboardDeptHeader section="Depto Futebol" sectionIcon={Video} title={title} />
      {showFilters ? <AnaliseDesempenhoFilters /> : null}
      {!tenantId && showFilters ? (
        <p className="mt-4 text-sm text-muted-foreground">Selecione um clube para continuar.</p>
      ) : (
        children
      )}
    </Cup360PageShell>
  );
}
