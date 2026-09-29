"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ClinicalContext = {
  playerStatus?: string | null;
  playerStatusDetails?: string | null;
  physioSessions: Array<{
    id: string;
    status: string;
    disposition?: string | null;
    diagnosisLabel?: string | null;
    startedAt: string;
    region?: { namePt: string };
  }>;
  transitionPrograms: Array<{
    id: string;
    status: string;
    startedAt: string;
    originSession?: { diagnosisLabel?: string | null; region?: { namePt: string } };
    entries: Array<{ sessionDate: string; stillFeelsPain?: boolean }>;
  }>;
};

export function MedicalFisioContextPanel({ playerId }: { playerId: string }) {
  const [data, setData] = useState<ClinicalContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ClinicalContext>(`/medical-encounters/clinical-context/${playerId}`)
      .then(({ data: d }) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Sem dados de fisio/transição.</p>;
  }

  return (
    <div className="space-y-4 text-sm">
      {data.playerStatusDetails ? (
        <p className="rounded-lg border border-border/80 bg-muted/20 p-3 text-muted-foreground">
          Status operacional do atleta (fisio/transição):{" "}
          <span className="text-foreground">{data.playerStatusDetails}</span>
        </p>
      ) : null}

      <div>
        <p className="mb-2 font-medium">Fisioterapia</p>
        {data.physioSessions.length === 0 ? (
          <p className="text-muted-foreground">Nenhum episódio registrado.</p>
        ) : (
          <ul className="space-y-2">
            {data.physioSessions.map((s) => (
              <li key={s.id} className="rounded border border-border/60 p-2">
                <Link
                  href={`/dashboard/saude/fisioterapia/${s.id}`}
                  className="font-medium text-violet-300 hover:underline"
                >
                  {s.region?.namePt ?? "Sessão"} — {s.diagnosisLabel ?? s.status}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(s.startedAt), "dd/MM/yyyy", { locale: ptBR })}
                  {s.disposition ? ` · ${s.disposition}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-2 font-medium">Transição / RTP (fisiologia)</p>
        {data.transitionPrograms.length === 0 ? (
          <p className="text-muted-foreground">Nenhum programa de transição.</p>
        ) : (
          <ul className="space-y-2">
            {data.transitionPrograms.map((p) => (
              <li key={p.id} className="rounded border border-border/60 p-2">
                <p className="font-medium">
                  {p.originSession?.region?.namePt ?? "Programa"} — {p.status}
                </p>
                <p className="text-xs text-muted-foreground">
                  Início{" "}
                  {format(new Date(p.startedAt), "dd/MM/yyyy", { locale: ptBR })}
                  {p.entries[0]?.sessionDate ? ` · última ${p.entries[0].sessionDate}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
