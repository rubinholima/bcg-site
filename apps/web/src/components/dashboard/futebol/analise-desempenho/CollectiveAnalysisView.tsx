"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { NativeSelectField } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { AnalysisPitchMap } from "./AnalysisPitchMap";

type Props = { sessionId: string };

export function CollectiveAnalysisView({ sessionId }: Props) {
  const [data, setData] = useState<Awaited<ReturnType<typeof load>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [classFilter, setClassFilter] = useState("");

  async function load() {
    const { data: d } = await api.get<{
      metrics: { team: Record<string, unknown> };
      events: Array<{ id: string; analysisClass?: string | null; tagDefinition?: { label: string }; outcome?: string | null }>;
      fieldPoints: Array<{ eventId: string; x: number; y: number }>;
      session: { collectiveNotes?: string | null };
    }>(`/performance-analysis/sessions/${sessionId}/collective`);
    return d;
  }

  useEffect(() => {
    void load()
      .then((d) => {
        setData(d);
        setNotes(d.session.collectiveNotes ?? "");
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  async function saveNotes() {
    await api.patch(`/performance-analysis/sessions/${sessionId}/notes`, {
      collectiveNotes: notes,
    });
  }

  async function setEventClass(eventId: string, analysisClass: string) {
    await api.patch(`/performance-analysis/events/${eventId}`, { analysisClass });
    const d = await load();
    setData(d);
  }

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  if (!data) return null;

  const team = data.metrics.team as {
    passAttempts: number;
    passSuccess: number;
    passAccuracyPct: number | null;
    shots: number;
    duels: number;
    crosses: number;
  };

  const events = data.events.filter((e) =>
    classFilter ? e.analysisClass === classFilter : true,
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Passes" value={`${team.passSuccess}/${team.passAttempts}`} />
        <KpiCard label="Precisão passe" value={team.passAccuracyPct != null ? `${team.passAccuracyPct}%` : "—"} />
        <KpiCard label="Cruzamentos" value={team.crosses} />
        <KpiCard label="Duelos" value={team.duels} />
      </div>
      <AnalysisPitchMap
        points={data.fieldPoints.map((p) => ({ ...p, eventId: p.eventId }))}
        className="max-w-lg"
      />
      <NativeSelectField
        value={classFilter}
        onChange={(e) => setClassFilter(e.target.value)}
        placeholder="Filtrar classificação"
        options={[
          { value: "", label: "Todas" },
          { value: "acerto", label: "Acerto" },
          { value: "correcao", label: "Correção" },
          { value: "destaque", label: "Destaque" },
        ]}
      />
      <ul className="max-h-64 overflow-y-auto rounded border border-border divide-y divide-border text-sm">
        {events.slice(0, 80).map((ev) => (
          <li key={ev.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <span className="min-w-0 flex-1">
              {ev.tagDefinition?.label} · {ev.outcome ?? "—"}
            </span>
            {(["acerto", "correcao", "destaque"] as const).map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={ev.analysisClass === c ? "default" : "outline"}
                onClick={() => void setEventClass(ev.id, c)}
              >
                {c}
              </Button>
            ))}
          </li>
        ))}
      </ul>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Observações coletivas"
        rows={3}
      />
      <Button type="button" onClick={() => void saveNotes()}>
        Salvar observações
      </Button>
    </div>
  );
}
