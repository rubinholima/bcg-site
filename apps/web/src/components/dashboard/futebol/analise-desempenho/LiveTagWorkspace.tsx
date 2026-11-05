"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { api } from "@/lib/api";
import { analysisEventQueue } from "@/lib/analysis-event-queue";
import {
  type AnalysisEventRow,
  type AnalysisSessionDetail,
  type AnalysisTagDefinition,
  type TeamMetrics,
  parseTagOutcomes,
  youtubeEmbedUrl,
} from "@/lib/performance-analysis-types";
import { AnalysisPitchMap } from "./AnalysisPitchMap";
import {
  AnalysisVideoTelestrationCanvas,
  AnalysisVideoTelestrationToolbar,
  type AnalysisVideoStroke,
} from "./AnalysisVideoTelestrationLayer";
import {
  labelPitchZone,
  type AnalysisPitchZoneKey,
} from "@/lib/analysis-pitch-zones";
import { cn } from "@/lib/utils";

type RosterPlayer = {
  id: string;
  name: string;
  jerseyNumber: number | null;
  position: string | null;
};

type LiveClockDto = {
  running: boolean;
  period: string;
  clockSeconds: number;
  effectiveClockSeconds: number;
  display: string;
  scoreHome: number | null;
  scoreAway: number | null;
  videoSyncOffsetMs: number;
};

const PERIOD_LABELS: Record<string, string> = {
  "1T": "1º tempo",
  "2T": "2º tempo",
  INT: "Intervalo",
  PR: "Prorrogação",
};

const OUTCOME_LABEL: Record<string, string> = {
  certo: "Certo",
  errado: "Errado",
  gol: "Gol",
  defesa: "No gol (defesa)",
  fora: "Para fora",
  bloqueada: "Bloqueada",
  vencido: "Ganho",
  perdido: "Perdido",
  neutro: "—",
  a_favor: "A favor",
  contra: "Contra",
};

type Props = {
  sessionId: string;
  tenantId: string;
  mode: "live" | "review";
};

export function LiveTagWorkspace({ sessionId, tenantId, mode }: Props) {
  const [detail, setDetail] = useState<AnalysisSessionDetail | null>(null);
  const [clock, setClock] = useState<LiveClockDto | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [events, setEvents] = useState<AnalysisEventRow[]>([]);
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<AnalysisTagDefinition | null>(null);
  const [tagStep, setTagStep] = useState<"idle" | "side" | "player" | "zone" | "outcome">("idle");
  const [teamSide, setTeamSide] = useState<"proprio" | "adversario">("proprio");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [adversaryLabel, setAdversaryLabel] = useState("");
  const [selectedZone, setSelectedZone] = useState<AnalysisPitchZoneKey | null>(null);
  const [videoSourceId, setVideoSourceId] = useState("");
  const [drawToolActive, setDrawToolActive] = useState(false);
  const [drawStrokes, setDrawStrokes] = useState<AnalysisVideoStroke[]>([]);
  const [resetOpen, setResetOpen] = useState(false);
  const [queueTick, setQueueTick] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastPlayerRef = useRef("");

  const reloadEvents = useCallback(async () => {
    const [{ data: evs }, { data: m }] = await Promise.all([
      api.get<AnalysisEventRow[]>(`/performance-analysis/sessions/${sessionId}/events`),
      api.get<{ team: TeamMetrics }>(`/performance-analysis/sessions/${sessionId}/metrics`),
    ]);
    setEvents(Array.isArray(evs) ? evs : []);
    setMetrics(m.team);
  }, [sessionId]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: sess }, { data: ros }] = await Promise.all([
        api.get<AnalysisSessionDetail>(`/performance-analysis/sessions/${sessionId}`),
        api.get<{ players: RosterPlayer[] }>(`/performance-analysis/sessions/${sessionId}/roster`),
      ]);
      setDetail(sess);
      setClock(sess.session.liveClock as LiveClockDto);
      setRoster(ros.players ?? []);
      if (sess.videoSources[0]?.id) setVideoSourceId(sess.videoSources[0].id);
      await reloadEvents();
    } finally {
      setLoading(false);
    }
  }, [sessionId, reloadEvents]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    const unsub = analysisEventQueue.subscribe(() => setQueueTick((n) => n + 1));
    const unbind = analysisEventQueue.bindSession(sessionId);
    return () => {
      unsub();
      unbind();
    };
  }, [sessionId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!clock?.running) return;
      setClock((c) =>
        c
          ? {
              ...c,
              effectiveClockSeconds: c.effectiveClockSeconds + 1,
              display: formatClockDisplay(c.effectiveClockSeconds + 1),
            }
          : c,
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, [clock?.running]);

  const filteredRoster = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.jerseyNumber ?? "").includes(q),
    );
  }, [roster, playerSearch]);

  const activeVideo = detail?.videoSources.find((v) => v.id === videoSourceId);
  const embed = youtubeEmbedUrl(activeVideo?.externalUrl);
  const streamPath = activeVideo?.streamUrl ? `/api${activeVideo.streamUrl}` : null;

  async function clockCmd(body: Record<string, unknown>) {
    const { data } = await api.patch<{ liveClock: LiveClockDto }>(
      `/performance-analysis/sessions/${sessionId}/live-clock`,
      body,
    );
    setClock(data.liveClock);
  }

  function videoMsNow(): number {
    const el = videoRef.current;
    if (!el) return 0;
    return Math.round(el.currentTime * 1000) + (clock?.videoSyncOffsetMs ?? 0);
  }

  function resetTagFlow() {
    setSelectedTag(null);
    setTagStep("idle");
    setSelectedZone(null);
    setAdversaryLabel("");
  }

  async function commitTag(outcome: string) {
    if (!selectedTag || !clock || !selectedZone) return;
    const requiresPlayer = Boolean(selectedTag.requiresPlayer);
    const playerId = selectedPlayerId || (requiresPlayer ? "" : "");
    if (requiresPlayer && teamSide === "proprio" && !playerId) return;
    if (requiresPlayer && teamSide === "adversario" && !playerId && !adversaryLabel.trim()) return;

    const payload = {
      tagDefinitionId: selectedTag.id,
      playerId: teamSide === "proprio" ? playerId || null : playerId || null,
      teamSide,
      outcome: outcome || null,
      startMs: videoMsNow(),
      matchPeriod: clock.period,
      matchClockSeconds: clock.effectiveClockSeconds,
      videoSourceId: activeVideo?.id ?? null,
      fieldZoneKey: selectedZone,
      notes:
        teamSide === "adversario" && adversaryLabel.trim() && !playerId
          ? `Adversário: ${adversaryLabel.trim()}`
          : null,
    };

    analysisEventQueue.enqueue(payload);
    if (playerId) lastPlayerRef.current = playerId;
    resetTagFlow();
    void reloadEvents();
  }

  async function undoLast() {
    await api.post(`/performance-analysis/sessions/${sessionId}/events/undo`, {});
    await reloadEvents();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        void undoLast();
        return;
      }
      if (!detail?.tags) return;
      const key = e.key.toLowerCase();
      const tag = detail.tags.find((t) => t.shortcutKey === key);
      if (tag) {
        e.preventDefault();
        setSelectedTag(tag);
        setTagStep("side");
        setSelectedZone(null);
        if (!tag.requiresPlayer && lastPlayerRef.current) {
          setSelectedPlayerId(lastPlayerRef.current);
        }
      }
      if (selectedTag && tagStep === "player" && /^\d$/.test(key)) {
        const num = Number(key);
        const byNum = filteredRoster.find((p) => p.jerseyNumber === num);
        if (byNum) {
          e.preventDefault();
          setSelectedPlayerId(byNum.id);
          setTagStep("zone");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail?.tags, filteredRoster, selectedTag, sessionId]);

  const queue = analysisEventQueue.getSnapshot();
  const pendingCount =
    queueTick >= 0
      ? queue.filter((q) => q.status === "pending" || q.status === "syncing").length
      : 0;
  const failed = queue.filter((q) => q.status === "failed");

  if (loading && !detail) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{detail?.session.title}</p>
          <p className="text-xs text-muted-foreground">
            {PERIOD_LABELS[clock?.period ?? "1T"] ?? clock?.period} · {clock?.display ?? "0:00"}
            {pendingCount > 0 ? ` · ${pendingCount} pendente(s)` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 text-lg font-mono tabular-nums">
          <Input
            className="h-8 w-12 px-1 text-center text-foreground"
            type="number"
            value={clock?.scoreHome ?? ""}
            onChange={(e) =>
              void clockCmd({
                action: "set_score",
                scoreHome: e.target.value === "" ? null : Number(e.target.value),
                scoreAway: clock?.scoreAway ?? null,
              })
            }
          />
          <span className="text-muted-foreground">×</span>
          <Input
            className="h-8 w-12 px-1 text-center text-foreground"
            type="number"
            value={clock?.scoreAway ?? ""}
            onChange={(e) =>
              void clockCmd({
                action: "set_score",
                scoreHome: clock?.scoreHome ?? null,
                scoreAway: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </div>
        {mode === "live" ? (
          <>
            {!clock?.running ? (
              <Button size="sm" type="button" onClick={() => void clockCmd({ action: clock?.clockSeconds ? "resume" : "start" })}>
                <Play className="mr-1 h-4 w-4" />
                {clock?.clockSeconds ? "Retomar" : "Iniciar"}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" type="button" onClick={() => void clockCmd({ action: "pause" })}>
                <Pause className="mr-1 h-4 w-4" />
                Pausar
              </Button>
            )}
            <Button size="sm" variant="outline" type="button" onClick={() => setResetOpen(true)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["1T", "INT", "2T", "PR"] as const).map((p) => (
          <Button
            key={p}
            size="sm"
            variant={clock?.period === p ? "default" : "outline"}
            type="button"
            onClick={() => void clockCmd({ action: "set_period", period: p })}
          >
            {PERIOD_LABELS[p]}
          </Button>
        ))}
        <Input
          type="number"
          min={0}
          className="h-8 w-24 text-foreground"
          placeholder="Relógio (s)"
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) void clockCmd({ action: "set_clock", clockSeconds: v });
          }}
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black">
                {embed ? (
                  <iframe title="Vídeo" src={embed} className="h-full w-full" />
                ) : streamPath ? (
                  <>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video ref={videoRef} src={streamPath} controls className="h-full w-full" />
                    <AnalysisVideoTelestrationCanvas
                      videoRef={videoRef}
                      toolActive={drawToolActive}
                      strokes={drawStrokes}
                      setStrokes={setDrawStrokes}
                    />
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
                    Live Tag funciona sem vídeo. Adicione fonte depois se necessário.
                  </div>
                )}
              </div>
              {streamPath && activeVideo?.id ? (
                <AnalysisVideoTelestrationToolbar
                  sessionId={sessionId}
                  videoSourceId={activeVideo.id}
                  videoRef={videoRef}
                  toolActive={drawToolActive}
                  setToolActive={setDrawToolActive}
                  strokes={drawStrokes}
                  setStrokes={setDrawStrokes}
                />
              ) : null}
            </div>
            <AnalysisPitchMap
              points={events
                .filter((e) => e.fieldX != null && e.fieldY != null)
                .slice(-12)
                .map((e) => ({
                  eventId: e.id,
                  x: e.fieldX!,
                  y: e.fieldY!,
                  fieldZoneKey: (e as { fieldZoneKey?: string }).fieldZoneKey,
                  label: e.tagDefinition?.label,
                }))}
              selectedZone={selectedZone}
              onPickZone={(zone) => {
                setSelectedZone(zone);
                if (selectedTag && tagStep === "zone") setTagStep("outcome");
              }}
              showZoneLabels={tagStep === "zone" || Boolean(selectedZone)}
            />
          </div>
          {selectedZone ? (
            <p className="text-xs text-muted-foreground">Zona: {labelPitchZone(selectedZone)}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {detail?.tags.map((tag) => (
              <Button
                key={tag.id}
                type="button"
                size="sm"
                variant={selectedTag?.id === tag.id ? "default" : "outline"}
                className="h-auto min-h-[44px] flex-col py-2"
                onClick={() => {
                  setSelectedTag(tag);
                  setTagStep("side");
                  setSelectedZone(null);
                }}
              >
                <span>{tag.label}</span>
                {tag.shortcutKey ? (
                  <span className="text-[10px] opacity-70">{tag.shortcutKey.toUpperCase()}</span>
                ) : null}
              </Button>
            ))}
          </div>

          {selectedTag ? (
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{selectedTag.label}</p>
                <Button type="button" size="sm" variant="ghost" onClick={resetTagFlow}>
                  Cancelar
                </Button>
              </div>
              {tagStep === "side" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={teamSide === "proprio" ? "default" : "outline"}
                    onClick={() => {
                      setTeamSide("proprio");
                      setTagStep(selectedTag.requiresPlayer ? "player" : "zone");
                    }}
                  >
                    Nosso time
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={teamSide === "adversario" ? "default" : "outline"}
                    onClick={() => {
                      setTeamSide("adversario");
                      setTagStep(selectedTag.requiresPlayer ? "player" : "zone");
                    }}
                  >
                    Adversário
                  </Button>
                </div>
              ) : null}

              {tagStep === "player" || tagStep === "zone" || tagStep === "outcome" ? (
                <>
                  {selectedTag.requiresPlayer && tagStep === "player" ? (
                    <>
                      {teamSide === "adversario" ? (
                        <Input
                          placeholder="Atleta adversário (nome ou nº)"
                          value={adversaryLabel}
                          onChange={(e) => setAdversaryLabel(e.target.value)}
                          className="text-foreground"
                        />
                      ) : null}
                      <Input
                        placeholder="Buscar atleta ou número…"
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        className="text-foreground"
                      />
                      <div className="max-h-40 overflow-y-auto grid grid-cols-2 gap-1 sm:grid-cols-3">
                        {filteredRoster.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className={cn(
                              "rounded border px-2 py-2 text-left text-xs",
                              selectedPlayerId === p.id ? "border-primary bg-primary/10" : "border-border",
                            )}
                            onClick={() => {
                              setSelectedPlayerId(p.id);
                              setTagStep("zone");
                            }}
                          >
                            <span className="font-bold text-amber-400">{p.jerseyNumber ?? "—"}</span>{" "}
                            {p.name}
                          </button>
                        ))}
                      </div>
                      {teamSide === "adversario" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setTagStep("zone")}
                        >
                          Continuar sem elenco
                        </Button>
                      ) : null}
                    </>
                  ) : null}

                  {tagStep === "zone" ? (
                    <p className="text-sm text-amber-200/90">Selecione a zona no plano de campo (3×3).</p>
                  ) : null}

                  {tagStep === "outcome" && selectedZone ? (
                    <div className="flex flex-wrap gap-2">
                      {parseTagOutcomes(selectedTag.outcomes).length <= 1 ? (
                        <Button type="button" size="sm" onClick={() => void commitTag("neutro")}>
                          Salvar ação
                        </Button>
                      ) : (
                        parseTagOutcomes(selectedTag.outcomes).map((o) => (
                          <Button key={o} type="button" size="sm" onClick={() => void commitTag(o)}>
                            {OUTCOME_LABEL[o] ?? o}
                          </Button>
                        ))
                      )}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          {metrics ? (
            <div className="grid grid-cols-2 gap-2">
              <KpiCard label="Passes" value={`${metrics.passSuccess}/${metrics.passAttempts}`} />
              <KpiCard
                label="Precisão"
                value={metrics.passAccuracyPct != null ? `${metrics.passAccuracyPct}%` : "—"}
              />
              <KpiCard label="Finalizações" value={metrics.shots} />
              <KpiCard label="Gols" value={metrics.goals ?? 0} />
              <KpiCard label="Faltas" value={metrics.fouls ?? 0} />
              <KpiCard label="Cartões" value={`${metrics.yellowCards ?? 0}/${metrics.redCards ?? 0}`} />
            </div>
          ) : null}

          {failed.length > 0 ? (
            <div className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs">
              {failed.map((f) => (
                <div key={f.clientEventKey} className="flex items-center justify-between gap-2 py-1">
                  <span className="truncate">{f.error}</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => analysisEventQueue.retry(f.clientEventKey)}>
                    Reenviar
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
            <p className="sticky top-0 border-b border-border bg-background px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
              Timeline
            </p>
            <ul className="divide-y divide-border">
              {[...events].reverse().slice(0, 50).map((ev) => (
                <li key={ev.id} className="px-3 py-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">
                      {ev.matchClockSeconds != null ? formatClockDisplay(ev.matchClockSeconds) : "—"} ·{" "}
                      {ev.tagDefinition?.label}
                    </span>
                    <span className="text-muted-foreground">{ev.source}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {[ev.player?.name, ev.outcome ? OUTCOME_LABEL[ev.outcome] ?? ev.outcome : null]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  {mode === "review" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-7 px-2"
                      onClick={() => {
                        if (streamPath && videoRef.current && ev.startMs != null) {
                          videoRef.current.currentTime = ev.startMs / 1000;
                        }
                      }}
                    >
                      Ir ao vídeo
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zerar relógio?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void clockCmd({ action: "reset" });
                setResetOpen(false);
              }}
            >
              Zerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatClockDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
