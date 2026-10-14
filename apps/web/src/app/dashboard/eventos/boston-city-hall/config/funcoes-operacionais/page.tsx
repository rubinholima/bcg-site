"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallShell } from "@/components/dashboard/boston-city-hall/BostonCityHallShell";
import { BostonCityHallOperationalRolesConfig } from "@/components/dashboard/boston-city-hall/BostonCityHallOperationalRolesConfig";
import { useAuth } from "@/context/AuthContext";

export default function BostonCityHallOperationalRolesPage() {
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
    <BostonCityHallShell>
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <div className="space-y-2 pb-6">
          <h1 className="text-xl font-semibold text-slate-100">Funções operacionais</h1>
          <BostonCityHallOperationalRolesConfig />
        </div>
      </Suspense>
    </BostonCityHallShell>
  );
}
