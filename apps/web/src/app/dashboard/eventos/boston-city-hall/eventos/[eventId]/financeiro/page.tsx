"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallEventFinancial } from "@/components/dashboard/boston-city-hall/BostonCityHallEventFinancial";
import { useAuth } from "@/context/AuthContext";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";

function FinanceiroInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const returnTo = searchParams.get("returnTo")?.trim();
  const workspaceUrl = `${BCH_BASE}/eventos/${encodeURIComponent(eventId)}`;
  const backHref = returnTo || workspaceUrl;
  const backLabel = returnTo ? "Voltar ao workspace" : "Voltar ao evento";

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
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <FinanceiroInner />
    </Suspense>
  );
}
