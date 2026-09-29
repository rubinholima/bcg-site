"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalEncounterDetail } from "@/components/dashboard/medico/MedicalEncounterDetail";
import type { MedicalEncounter } from "@/types/medical-encounter";

export default function AtendimentoMedicoDetailPage() {
  const params = useParams();
  const playerId = params.playerId as string;
  const encounterId = params.encounterId as string;
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [enc, setEnc] = useState<MedicalEncounter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("medico")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    if (!canAccessModule("medico")) return;
    api
      .get<MedicalEncounter>(`/medical-encounters/${encounterId}`)
      .then(({ data }) => setEnc(data))
      .catch(() => setEnc(null))
      .finally(() => setLoading(false));
  }, [encounterId, canAccessModule]);

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
        Prontuário do atleta
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atendimento médico</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !enc ? (
            <p className="text-sm text-muted-foreground">Atendimento não encontrado.</p>
          ) : (
            <MedicalEncounterDetail
              playerId={playerId}
              encounter={enc}
              onUpdated={setEnc}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
