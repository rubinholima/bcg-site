"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trophy } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { JogosDashboard } from "@/components/dashboard/futebol/jogos/JogosDashboard";
import { useAuth } from "@/context/AuthContext";

export default function FutebolJogosPage() {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();

  useEffect(() => {
    if (!loading && !canAccessModule("futebol_jogos")) router.replace("/403");
  }, [canAccessModule, loading, router]);

  if (loading || !canAccessModule("futebol_jogos")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader section="Depto de Futebol" sectionIcon={Trophy} title="Jogos" />
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <JogosDashboard />
      </Suspense>
    </div>
  );
}
