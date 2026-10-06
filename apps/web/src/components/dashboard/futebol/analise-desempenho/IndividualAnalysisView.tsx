"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { NativeSelectField } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import type { AnalysisEventRow } from "@/lib/performance-analysis-types";

type RosterPlayer = { id: string; name: string; jerseyNumber: number | null };

type MaterialRow = {
  id: string;
  eventId: string | null;
  clipId: string | null;
};

type Props = { sessionId: string; tenantId: string };

export function IndividualAnalysisView({ sessionId, tenantId }: Props) {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [materialBusy, setMaterialBusy] = useState<string | null>(null);
  const [payload, setPayload] = useState<{
    player: { name: string; jerseyNumber: number | null; position: string | null } | null;
    metrics: Record<string, unknown> | null;
    events: AnalysisEventRow[];
    clips: Array<{ id: string; title: string; startMs: number; endMs: number }>;
    material: MaterialRow[];
  } | null>(null);

  const loadIndividual = useCallback(async (pid: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/performance-analysis/sessions/${sessionId}/individual/${pid}`,
      );
      setPayload(data as typeof payload);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

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
    void loadIndividual(playerId);
  }, [playerId, loadIndividual]);

  const materialEventIds = useMemo(() => {
    const set = new Set<string>();
    for (const m of payload?.material ?? []) {
      if (m.eventId) set.add(m.eventId);
    }
    return set;
  }, [payload?.material]);

  const materialByEventId = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of payload?.material ?? []) {
      if (m.eventId) map.set(m.eventId, m.id);
    }
    return map;
  }, [payload?.material]);

  async function addToMaterial(eventId: string) {
    if (!playerId || materialEventIds.has(eventId)) return;
    setMaterialBusy(eventId);
    try {
      await api.post(
        `/performance-analysis/sessions/${sessionId}/players/${playerId}/material`,
        { eventId },
      );
      await loadIndividual(playerId);
    } finally {
      setMaterialBusy(null);
    }
  }

  async function removeFromMaterial(eventId: string) {
    const itemId = materialByEventId.get(eventId);
    if (!itemId || !playerId) return;
    setMaterialBusy(eventId);
    try {
      await api.delete(`/performance-analysis/player-material/${itemId}`);
      await loadIndividual(playerId);
    } finally {
      setMaterialBusy(null);
    }
  }

  const m = payload?.metrics as {
    totalTagged?: number;
    passAttempts?: number;
    passAccuracyPct?: number | null;
    shots?: number;
    duels?: number;
  } | null;

  const materialCount = payload?.material?.length ?? 0;

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
            {payload.player.name} · {payload.player.position ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            Material do atleta (dossiê): {materialCount} item(ns) curado(s) nesta sessão. Só entram no
            dossiê após adicionar aqui.
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
            {payload.events.map((ev) => {
              const inMaterial = materialEventIds.has(ev.id);
              const busy = materialBusy === ev.id;
              return (
                <li key={ev.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    {ev.tagDefinition?.label} · {ev.outcome ?? "—"}
                    {inMaterial ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-400">
                        <Check className="h-3 w-3" aria-hidden />
                        No material
                      </span>
                    ) : null}
                  </span>
                  {inMaterial ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void removeFromMaterial(ev.id)}
                    >
                      Remover
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void addToMaterial(ev.id)}
                    >
                      Material
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {playerId ? (
            <Link
              href={`/dashboard/cadastros/jogadores/${playerId}`}
              className="text-xs text-violet-400 hover:underline"
            >
              Abrir ficha do atleta
            </Link>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
