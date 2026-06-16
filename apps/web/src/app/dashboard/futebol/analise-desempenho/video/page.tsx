"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Video } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export default function FutebolAnaliseVideoPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("futebol_analise_desempenho")) {
      router.replace("/403");
    }
  }, [authLoading, canAccessModule, router]);

  if (authLoading || !canAccessModule("futebol_analise_desempenho")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/futebol/analise-desempenho"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Análise e desempenho
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Video className="h-8 w-8" />
          Análise de vídeo
        </h1>
        <p className="mt-1 text-muted-foreground">
          Vídeos e imagens do jogo — passe errado, mapa de calor, recortes e relatórios táticos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Upload de vídeos, marcação de lances, mapas de calor e dashboards de análise tática serão
            centralizados neste módulo.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Enquanto isso, utilize Métricas de atletas para indicadores já cadastrados no elenco.
        </CardContent>
      </Card>
    </div>
  );
}
