"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallAgenda } from "@/components/dashboard/boston-city-hall/BostonCityHallAgenda";
import { useAuth } from "@/context/AuthContext";

export default function BostonCityHallAgendaPage() {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();

  useEffect(() => {
    if (!loading && !canAccessModule("eventos")) router.replace("/403");
  }, [canAccessModule, loading, router]);

  if (loading || !canAccessModule("eventos")) {
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
      <BostonCityHallAgenda />
    </Suspense>
  );
}
