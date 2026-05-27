"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallShell } from "@/components/dashboard/boston-city-hall/BostonCityHallShell";
import { BostonCityHallCrm } from "@/components/dashboard/boston-city-hall/BostonCityHallCrm";
import { useAuth } from "@/context/AuthContext";

export default function BostonCityHallCrmPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("eventos")) {
      router.replace("/403");
    }
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
      title="CRM — Leads"
      description="Monitore contatos do site e cadastros manuais, filtros e anotações comerciais."
    >
      <BostonCityHallCrm />
    </BostonCityHallShell>
  );
}
