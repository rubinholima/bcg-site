"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import type { CoachTrainingSession } from "@/lib/treinadores-types";
import { getPublicImageUrl } from "@/lib/media-url";

interface Props {
  tenantId: string;
  category?: string;
}

export function TreinadorGoleirosComissaoTab({ tenantId, category }: Props) {
  const [sessions, setSessions] = useState<CoachTrainingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<CoachTrainingSession | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<CoachTrainingSession[]>(`/treinador-goleiros/comissao/training-sessions?${params}`)
      .then(({ data }) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [tenantId, category]);

  useEffect(() => {
    if (!selectedId || !tenantId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    api
      .get<CoachTrainingSession>(
        `/treinador-goleiros/comissao/training-sessions/${selectedId}?tenantId=${tenantId}`,
      )
      .then(({ data }) => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId, tenantId]);

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Treinos da comissão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum treino encontrado.</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`w-full rounded-lg border p-3 text-left text-sm ${selectedId === s.id ? "border-primary bg-primary/5" : "border-border/60"}`}
                onClick={() => setSelectedId(s.id)}
              >
                <div className="font-medium">
                  {formatDateDayMonYear(new Date(`${s.sessionDate}T12:00:00`))}
                </div>
                <div className="text-muted-foreground">{s.objectives?.slice(0, 60) || s.status}</div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhe (somente leitura)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {detailLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : !detail ? (
            <p className="text-muted-foreground">Selecione um treino para visualizar.</p>
          ) : (
            <>
              <p>
                <span className="text-muted-foreground">Data:</span>{" "}
                {formatDateDayMonYear(new Date(`${detail.sessionDate}T12:00:00`))}
                {detail.startTime && detail.endTime ? ` · ${detail.startTime} – ${detail.endTime}` : null}
              </p>
              {detail.objectives ? (
                <div>
                  <p className="font-medium">Objetivos</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{detail.objectives}</p>
                </div>
              ) : null}
              {(detail.activities ?? []).length > 0 ? (
                <div>
                  <p className="font-medium">Atividades</p>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {detail.activities.map((a) => (
                      <li key={a.id ?? a.title}>{a.title}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {(detail.attachments ?? []).length > 0 ? (
                <div>
                  <p className="font-medium">Anexos</p>
                  <ul className="space-y-1">
                    {detail.attachments.map((a) => {
                      const url = getPublicImageUrl(a.fileUrl) || a.fileUrl;
                      return (
                        <li key={a.id ?? a.fileUrl}>
                          <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">
                            {a.label || "Plano"}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {detail.agendaEntry ? (
                <p className="text-muted-foreground">Agenda: {detail.agendaEntry.title}</p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
