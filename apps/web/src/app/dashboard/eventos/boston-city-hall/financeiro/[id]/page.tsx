"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallShell } from "@/components/dashboard/boston-city-hall/BostonCityHallShell";
import { BostonCityHallFinanceDetail } from "@/components/dashboard/boston-city-hall/BostonCityHallFinanceDetail";
import { useAuth } from "@/context/AuthContext";

function DetailInner() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  return <BostonCityHallFinanceDetail receivableId={id} />;
}

export default function BostonCityHallFinanceDetailPage() {
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
    <BostonCityHallShell title="Financeiro">
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
