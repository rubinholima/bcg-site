"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { NativeSelectField } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import type { AnalysisEventRow } from "@/lib/performance-analysis-types";

type RosterPlayer = { id: string; name: string; jerseyNumber: number | null };

type Props = { sessionId: string; tenantId: string };

export function IndividualAnalysisView({ sessionId, tenantId }: Props) {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<{
    player: { name: string; jerseyNumber: number | null; position: string | null } | null;
    metrics: Record<string, unknown> | null;
    events: AnalysisEventRow[];
    clips: Array<{ id: string; title: string; startMs: number; endMs: number }>;
  } | null>(null);

  useEffect(() => {
    api
      .get<{ players: RosterPlayer[] }>(`/performance-analysis/sessions/${sessionId}/roster`)
      .then(({ data }) => setRoster(data.players ?? []));
  }, [sessionId]);

  useEffect(() => {
    if (!playerId) {
      setPayload(null);
      return;
    }
    setLoading(true);
    api
      .get(`/performance-analysis/sessions/${sessionId}/individual/${playerId}`)
      .then(({ data }) => setPayload(data as typeof payload))
      .finally(() => setLoading(false));
  }, [playerId, sessionId]);

  async function addToMaterial(eventId: string) {
    if (!playerId) return;
    await api.post(`/performance-analysis/sessions/${sessionId}/players/${playerId}/material`, {
      eventId,
    });
  }

  const m = payload?.metrics as {
    totalTagged?: number;
    passAttempts?: number;
    passAccuracyPct?: number | null;
    shots?: number;
    duels?: number;
  } | null;

  return (
    <div className="space-y-4">
      <NativeSelectField
        value={playerId}
        onChange={(e) => setPlayerId(e.target.value)}
        placeholder="Selecione o atleta…"
        options={roster.map((p) => ({
          value: p.id,
          label: `${p.jerseyNumber ?? "—"} · ${p.name}`,
        }))}
      />
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
      {payload?.player ? (
        <>
          <p className="text-sm font-medium">
            {payload.player.name} · {payload.player.position ?? tenantId}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Ações" value={m?.totalTagged ?? 0} />
            <KpiCard label="Passes" value={m?.passAttempts ?? 0} />
            <KpiCard
              label="Precisão"
              value={m?.passAccuracyPct != null ? `${m.passAccuracyPct}%` : "—"}
            />
            <KpiCard label="Duelos" value={m?.duels ?? 0} />
          </div>
          <ul className="max-h-72 overflow-y-auto rounded border border-border divide-y text-sm">
            {payload.events.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span>
                  {ev.tagDefinition?.label} · {ev.outcome ?? "—"}
                </span>
                <Button type="button" size="sm" variant="outline" onClick={() => void addToMaterial(ev.id)}>
                  Material
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
