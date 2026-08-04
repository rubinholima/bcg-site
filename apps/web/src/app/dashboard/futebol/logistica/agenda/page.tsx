"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2 } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { FutebolAgendaOperacional } from "@/components/dashboard/futebol/FutebolAgendaOperacional";
import { useAuth } from "@/context/AuthContext";

export default function FutebolLogisticaAgendaPage() {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();

  useEffect(() => {
    if (!loading && !canAccessModule("futebol_logistica")) router.replace("/403");
  }, [canAccessModule, loading, router]);

  if (loading || !canAccessModule("futebol_logistica")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Futebol — Logística"
        sectionIcon={Calendar}
        title="Agenda Futebol"
        description="Viagens, treinos, jogos e compromissos. Use os filtros e cadastre novos eventos por aqui."
      />
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <FutebolAgendaOperacional />
      </Suspense>
    </div>
  );
}
