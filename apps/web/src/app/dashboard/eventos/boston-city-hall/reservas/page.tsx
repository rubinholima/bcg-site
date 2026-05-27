"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallShell } from "@/components/dashboard/boston-city-hall/BostonCityHallShell";
import { BostonCityHallReservas } from "@/components/dashboard/boston-city-hall/BostonCityHallReservas";
import { useAuth } from "@/context/AuthContext";

export default function BostonCityHallReservasPage() {
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
      title="Reservas"
      description="Gerencie reservas, pré-reservas e bloqueios operacionais por espaço."
    >
      <BostonCityHallReservas />
    </BostonCityHallShell>
  );
}
