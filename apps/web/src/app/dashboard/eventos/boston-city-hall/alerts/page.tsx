"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallAlertCenter } from "@/components/dashboard/boston-city-hall/BostonCityHallAlertCenter";
import { useAuth } from "@/context/AuthContext";

function AlertsInner() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? undefined;
  return <BostonCityHallAlertCenter initialEventId={eventId} />;
}

export default function BostonCityHallAlertsPage() {
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
        <AlertsInner />
      </Suspense>
  );
}
