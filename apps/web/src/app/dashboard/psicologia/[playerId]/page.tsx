"use client";

import { useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { playerPsychologyProfileHref } from "@/lib/consultation-display";

/**
 * Redireciona para a ficha do jogador na aba Avaliação psicológica (relatório sintético).
 * Somente visualização — gráficos, consultas, impressões do psicólogo, perfil e nível de atenção.
 */
export default function PsicologiaPlayerRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = (params?.playerId ?? params?.id) as string | undefined;
  const fromConsultas = searchParams.get("from") === "consultas";
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) {
      router.replace("/403");
      return;
    }
    if (id) {
      router.replace(playerPsychologyProfileHref(id, fromConsultas ? "consultas" : undefined));
    } else {
      router.replace("/dashboard/psicologia");
    }
  }, [id, fromConsultas, canAccessModule, authLoading, router]);

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">Redirecionando...</p>
    </div>
  );
}
