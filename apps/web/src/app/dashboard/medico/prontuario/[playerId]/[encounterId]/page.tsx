"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MedicalEncounter } from "@/types/medical-encounter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{value}</p>
    </div>
  );
}

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

  const when = enc?.occurredAt
    ? format(new Date(enc.occurredAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : "";

  return (
    <div className="space-y-4">
      <Link
        href={`/dashboard/medico/prontuario/${playerId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Prontuário
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Atendimento médico</h1>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/medico/prontuario/${playerId}/novo`}>Novo atendimento</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{when}</CardTitle>
          {enc?.physicianName ? (
            <p className="text-sm text-muted-foreground">Dr(a). {enc.physicianName}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          ) : !enc ? (
            <p className="text-sm text-muted-foreground">Atendimento não encontrado.</p>
          ) : (
            <>
              <Field label="Motivo / queixa" value={enc.chiefComplaint} />
              <Field label="Anamnese / evolução" value={enc.anamnesis} />
              <Field label="Exame físico" value={enc.physicalExam} />
              <Field label="Diagnóstico / hipótese" value={enc.diagnosis} />
              <Field label="Conduta" value={enc.conduct} />
              <Field label="Exames solicitados" value={enc.examsRequested} />
              <Field label="Observações" value={enc.observations} />
              {(enc.restrictTraining || enc.restrictMatch || enc.returnForecastAt) && (
                <div className="rounded-lg border border-border/80 p-3 text-sm">
                  <p className="font-medium">Restrição / retorno (registro médico)</p>
                  <ul className="mt-2 list-inside list-disc text-muted-foreground">
                    {enc.restrictTraining ? <li>Treino restrito</li> : null}
                    {enc.restrictMatch ? <li>Jogo restrito</li> : null}
                    {enc.returnForecastAt ? (
                      <li>
                        Previsão:{" "}
                        {format(new Date(enc.returnForecastAt), "dd/MM/yyyy", { locale: ptBR })}
                      </li>
                    ) : null}
                  </ul>
                </div>
              )}
              {enc.referPhysio ? (
                <Field
                  label="Encaminhamento fisioterapia"
                  value={enc.referPhysioNotes ?? "Sim"}
                />
              ) : null}
              {enc.prescriptions?.length ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Prescrição</p>
                  <ul className="mt-2 space-y-2">
                    {enc.prescriptions.map((rx, i) => (
                      <li key={i} className="rounded border border-border/60 p-2 text-sm">
                        <p className="font-medium">{rx.medication}</p>
                        <p className="text-muted-foreground">
                          {[rx.presentation, rx.dose, rx.route, rx.frequency, rx.duration]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {rx.instructions ? (
                          <p className="mt-1 text-muted-foreground">{rx.instructions}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
