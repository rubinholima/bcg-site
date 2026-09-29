"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalEncounterForm } from "@/components/dashboard/medico/MedicalEncounterForm";

type PlayerRow = {
  id: string;
  name: string;
  tenantId: string;
};

export default function NovoAtendimentoMedicoPage() {
  const params = useParams();
  const playerId = params.playerId as string;
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("medico")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    if (!canAccessModule("medico")) return;
    api
      .get<PlayerRow>(`/players/${playerId}`)
      .then(({ data }) => setPlayer(data))
      .catch(() => setPlayer(null))
      .finally(() => setLoading(false));
  }, [playerId, canAccessModule]);

  if (authLoading || !canAccessModule("medico")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/dashboard/medico/prontuario/${playerId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao prontuário
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Novo atendimento médico</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro clínico</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !player ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MedicalEncounterForm
              tenantId={player.tenantId}
              playerId={player.id}
              playerName={player.name}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
