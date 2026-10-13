"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallShell } from "@/components/dashboard/boston-city-hall/BostonCityHallShell";
import { BostonCityHallEventSetup } from "@/components/dashboard/boston-city-hall/BostonCityHallEventSetup";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { useAuth } from "@/context/AuthContext";

function SetupInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const bookingId = searchParams.get("bookingId");
  const backHref = bookingId
    ? `${BCH_BASE}/operacao/${encodeURIComponent(bookingId)}`
    : `${BCH_BASE}/ticketing`;
  const backLabel = bookingId ? "Voltar à operação" : "Voltar aos ingressos";

  return (
    <BostonCityHallEventSetup
      eventId={eventId}
      bookingId={bookingId}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}

export default function BostonCityHallEventSetupPage() {
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
    <BostonCityHallShell titleOverride="Preparar evento">
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <SetupInner />
      </Suspense>
    </BostonCityHallShell>
  );
}
