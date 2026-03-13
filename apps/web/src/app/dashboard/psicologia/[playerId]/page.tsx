"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Redireciona para a ficha do jogador na aba Avaliação psicológica (relatório sintético).
 * Somente visualização — gráficos, consultas, impressões do psicólogo, perfil e nível de atenção.
 */
export default function PsicologiaPlayerRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const id = (params?.playerId ?? params?.id) as string | undefined;
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("psicologia")) {
      router.replace("/403");
      return;
    }
    if (id) {
      router.replace(`/dashboard/cadastros/jogadores/${id}/edit?tab=psicologica`);
    } else {
      router.replace("/dashboard/psicologia");
    }
  }, [id, canAccessModule, authLoading, router]);

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">Redirecionando...</p>
    </div>
  );
}
