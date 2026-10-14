"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallHome } from "@/components/dashboard/boston-city-hall/BostonCityHallHome";
import { useAuth } from "@/context/AuthContext";

function BostonCityHallHomeGate() {
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

  return <BostonCityHallHome />;
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
      <BostonCityHallHomeGate />
    </Suspense>
  );
}
