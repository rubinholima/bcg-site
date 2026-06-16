"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Dumbbell, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export default function FutebolPreparacaoFisicaPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("futebol_preparacao_fisica")) {
      router.replace("/403");
    }
  }, [authLoading, canAccessModule, router]);

  if (authLoading || !canAccessModule("futebol_preparacao_fisica")) {
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
          href="/dashboard/futebol/performance"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Performance
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Dumbbell className="h-8 w-8" />
          Preparação física
        </h1>
        <p className="mt-1 text-muted-foreground">
          Planejamento de treinos físicos, cargas e acompanhamento da preparação do elenco.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Sessões de preparação física, periodização e evolução por atleta serão gerenciadas neste hub
            de Performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Enquanto isso, consulte Fisiologista e Nutricionista para dados complementares do atleta.
        </CardContent>
      </Card>
    </div>
  );
}
