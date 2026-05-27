"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallShell } from "@/components/dashboard/boston-city-hall/BostonCityHallShell";
import { BostonCityHallAgenda, BostonCityHallAgendaLegend } from "@/components/dashboard/boston-city-hall/BostonCityHallAgenda";
import { useAuth } from "@/context/AuthContext";

export default function BostonCityHallAgendaPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("eventos")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  if (authLoading || !canAccessModule("eventos")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <BostonCityHallShell
      title="Agenda operacional"
      description="Visão mensal das reservas, pré-reservas e bloqueios do Boston City Hall."
    >
      <BostonCityHallAgendaLegend />
      <BostonCityHallAgenda />
    </BostonCityHallShell>
  );
}
