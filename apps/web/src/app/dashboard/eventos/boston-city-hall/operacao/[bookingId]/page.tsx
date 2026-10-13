"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallShell } from "@/components/dashboard/boston-city-hall/BostonCityHallShell";
import { BostonCityHallOperationDetail } from "@/components/dashboard/boston-city-hall/BostonCityHallOperationDetail";
import { useAuth } from "@/context/AuthContext";

function DetailInner() {
  const params = useParams();
  const bookingId = typeof params.bookingId === "string" ? params.bookingId : "";
  return <BostonCityHallOperationDetail bookingId={bookingId} />;
}

export default function BostonCityHallOperacaoDetailPage() {
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
        <DetailInner />
      </Suspense>
    </BostonCityHallShell>
  );
}
