"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2 } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { TreinadoresDashboard } from "@/components/dashboard/futebol/treinadores/TreinadoresDashboard";
import { useAuth } from "@/context/AuthContext";

export default function TreinadoresPage() {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();

  useEffect(() => {
    if (!loading && !canAccessModule("futebol_treinadores")) router.replace("/403");
  }, [canAccessModule, loading, router]);

  if (loading || !canAccessModule("futebol_treinadores")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader section="Futebol" sectionIcon={ClipboardList} title="Treinadores" />
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <TreinadoresDashboard />
      </Suspense>
    </div>
  );
}
