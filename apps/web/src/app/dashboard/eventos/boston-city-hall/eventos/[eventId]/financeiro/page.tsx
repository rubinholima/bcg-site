"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallShell } from "@/components/dashboard/boston-city-hall/BostonCityHallShell";
import { BostonCityHallEventFinancial } from "@/components/dashboard/boston-city-hall/BostonCityHallEventFinancial";
import { useAuth } from "@/context/AuthContext";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/boston-city-hall-lead-shared";

function FinanceiroInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const bookingId = searchParams.get("bookingId");
  const backHref = bookingId ? `${BCH_BASE}/operacao/${bookingId}` : `${BCH_BASE}/operacao`;
  const backLabel = bookingId ? "Voltar à operação" : "Voltar às operações";

  return (
    <BostonCityHallEventFinancial eventId={eventId} backHref={backHref} backLabel={backLabel} />
  );
}

export default function BostonCityHallEventFinanceiroPage() {
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
    <BostonCityHallShell title="Resultado financeiro">
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <FinanceiroInner />
      </Suspense>
    </BostonCityHallShell>
  );
}
