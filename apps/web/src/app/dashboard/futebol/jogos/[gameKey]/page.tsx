"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trophy } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { JogosDetailView } from "@/components/dashboard/futebol/jogos/JogosDetailView";
import { useAuth } from "@/context/AuthContext";

export default function FutebolJogoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { canAccessModule, loading } = useAuth();
  const gameKey = decodeURIComponent(String(params.gameKey ?? ""));

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
      <DashboardDeptHeader
        section="Depto de Futebol"
        sectionIcon={Trophy}
        title="Detalhe do jogo"
        backHref="/dashboard/futebol/jogos"
        backLabel="Jogos"
      />
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <JogosDetailView gameKey={gameKey} />
      </Suspense>
    </div>
  );
}
