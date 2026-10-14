"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallManagementDashboard } from "@/components/dashboard/boston-city-hall/BostonCityHallManagementDashboard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { VenueOverview } from "@/types/boston-city-hall";

function BostonCityHallOverviewGate() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<VenueOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("eventos")) {
      router.replace("/403");
    }
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    if (authLoading || !canAccessModule("eventos")) return;
    api
      .get<VenueOverview>("/boston-city-hall/overview")
      .then((r) => setOverview(r.data ?? null))
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
  }, [authLoading, canAccessModule]);

  if (authLoading || !canAccessModule("eventos")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-9 w-9 animate-spin text-sky-400/80" />
      </div>
    );
  }

  if (!overview) {
    return (
      <p className="py-12 text-center text-sm text-slate-400">
        Não foi possível carregar a visão geral. Tente novamente em instantes.
      </p>
    );
  }

  return <BostonCityHallManagementDashboard overview={overview} />;
}

export default function BostonCityHallPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Loader2 className="h-9 w-9 animate-spin text-sky-400/80" />
        </div>
      }
    >
      <BostonCityHallOverviewGate />
    </Suspense>
  );
}
