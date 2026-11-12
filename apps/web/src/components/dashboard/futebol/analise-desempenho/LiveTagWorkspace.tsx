"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { api } from "@/lib/api";
import { analysisEventQueue } from "@/lib/analysis-event-queue";
import {
  getVideoTimeCapabilities,
  isEditableTarget,
  readHtml5TimeMs,
  readYoutubeTimeMs,
} from "@/lib/analysis-player-time";
import { labelOutcome, labelQualifier, parseStringList } from "@/lib/analysis-tag-labels";
import { createYoutubePlayer, extractYoutubeVideoId, type YoutubePlayerHandle } from "@/lib/youtube-iframe-player";
import {
  DEFAULT_POSSESSION_SHORTCUTS,
  isFocusProtectedTarget,
  shouldIgnoreKeyRepeat,
} from "@/lib/live-tag-shortcuts";
import {
  type AnalysisEventRow,
  type AnalysisSessionDetail,
  type AnalysisTagDefinition,
  type TeamMetrics,
  parseTagOutcomes,
} from "@/lib/performance-analysis-types";
import { AnalysisTacticalDrawDialog } from "./AnalysisTacticalDrawDialog";
import { AnalysisPitchMap } from "./AnalysisPitchMap";
import {
  AnalysisVideoTelestrationCanvas,
  AnalysisVideoTelestrationToolbar,
  type AnalysisVideoStroke,
} from "./AnalysisVideoTelestrationLayer";
import {
  labelPitchZone,
  resolvePitchZoneFromXY,
  type AnalysisPitchZoneKey,
} from "@/lib/analysis-pitch-zones";
import { cn } from "@/lib/utils";

type RosterPlayer = {
  id: string;
  name: string;
  jerseyNumber: number | null;
  position: string | null;
};

type OpponentPlayer = { id: string; name: string; jerseyNumber: number | null };

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

type PendingCapture = {
  clientEventKey: string;
  serverEventId?: string;
  tag: AnalysisTagDefinition;
  stampedStartMs: number;
  stampedMatchClock: number;
  teamSide: "proprio" | "adversario";
  needsPlayer: boolean;
  needsField: boolean;
  needsOutcome: boolean;
  needsQualifier: boolean;
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
  const [opponentRoster, setOpponentRoster] = useState<OpponentPlayer[]>([]);
  const [events, setEvents] = useState<AnalysisEventRow[]>([]);
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [possession, setPossession] = useState<{
    ourPossessionMs: number;
    opponentPossessionMs: number;
    ballOutMs: number;
    ourPossessionPct: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerSearch, setPlayerSearch] = useState("");
  const [opponentSearch, setOpponentSearch] = useState("");
  const [teamSide, setTeamSide] = useState<"proprio" | "adversario">("proprio");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedOpponentPlayerId, setSelectedOpponentPlayerId] = useState("");
  const [selectedZone, setSelectedZone] = useState<AnalysisPitchZoneKey | null>(null);
  const [fieldXY, setFieldXY] = useState<{ x: number; y: number } | null>(null);
  const [videoSourceId, setVideoSourceId] = useState("");
  const [drawToolActive, setDrawToolActive] = useState(false);
  const [drawStrokes, setDrawStrokes] = useState<AnalysisVideoStroke[]>([]);
  const [resetOpen, setResetOpen] = useState(false);
  const [queueTick, setQueueTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null);
  const [selectedQualifier, setSelectedQualifier] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState("");
  const [drawOpen, setDrawOpen] = useState(false);
  const [drawEvent, setDrawEvent] = useState<AnalysisEventRow | null>(null);
  const [eventAnnotationIds, setEventAnnotationIds] = useState<Record<string, string>>({});
  const [youtubePlayer, setYoutubePlayer] = useState<YoutubePlayerHandle | null>(null);
  const [youtubeReady, setYoutubeReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const lastPlayerRef = useRef("");

  const reloadEvents = useCallback(async () => {
    const [{ data: evs }, { data: m }] = await Promise.all([
      api.get<AnalysisEventRow[]>(`/performance-analysis/sessions/${sessionId}/events`),
      api.get<{ team: TeamMetrics; possession?: typeof possession }>(
        `/performance-analysis/sessions/${sessionId}/metrics`,
      ),
    ]);
    setEvents(Array.isArray(evs) ? evs : []);
    setMetrics(m.team);
    if (m.possession) setPossession(m.possession);
  }, [sessionId]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: sess }, { data: ros }, { data: opp }] = await Promise.all([
        api.get<AnalysisSessionDetail>(`/performance-analysis/sessions/${sessionId}`),
        api.get<{ players: RosterPlayer[] }>(`/performance-analysis/sessions/${sessionId}/roster`),
        api.get<{ players: OpponentPlayer[] }>(
          `/performance-analysis/sessions/${sessionId}/opponent-roster`,
        ),
      ]);
      setDetail(sess);
      setClock(sess.session.liveClock as LiveClockDto);
      setRoster(ros.players ?? []);
      setOpponentRoster(opp.players ?? []);
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
    const unbind = analysisEventQueue.bindSession(sessionId, tenantId);
    return () => {
      unsub();
      unbind();
    };
  }, [sessionId, tenantId]);

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
      (p) => p.name.toLowerCase().includes(q) || String(p.jerseyNumber ?? "").includes(q),
    );
  }, [roster, playerSearch]);

  const filteredOpponent = useMemo(() => {
    const q = opponentSearch.trim().toLowerCase();
    if (!q) return opponentRoster;
    return opponentRoster.filter(
      (p) => p.name.toLowerCase().includes(q) || String(p.jerseyNumber ?? "").includes(q),
    );
  }, [opponentRoster, opponentSearch]);

  const activeVideo = detail?.videoSources.find((v) => v.id === videoSourceId);
  const youtubeVideoId = extractYoutubeVideoId(activeVideo?.externalUrl);
  const streamPath = activeVideo?.streamUrl ? `/api${activeVideo.streamUrl}` : null;
  const videoCaps = getVideoTimeCapabilities(Boolean(streamPath), Boolean(youtubeVideoId), youtubeReady);

  useEffect(() => {
    if (!youtubeVideoId || !youtubeContainerRef.current) {
      setYoutubePlayer(null);
      setYoutubeReady(false);
      return;
    }
    let handle: YoutubePlayerHandle | null = null;
    const el = youtubeContainerRef.current;
    void createYoutubePlayer(el, youtubeVideoId, clock?.videoSyncOffsetMs ?? 0)
      .then((h) => {
        handle = h;
        setYoutubePlayer(h);
        setYoutubeReady(true);
      })
      .catch(() => {
        setYoutubePlayer(null);
        setYoutubeReady(false);
      });
    return () => {
      handle?.destroy();
      setYoutubePlayer(null);
      setYoutubeReady(false);
    };
  }, [youtubeVideoId, activeVideo?.id, clock?.videoSyncOffsetMs]);

  const ourTeamLabel = "Nosso time";
  const opponentTeamLabel = "Adversário";

  async function clockCmd(body: Record<string, unknown>) {
    const { data } = await api.patch<{ liveClock: LiveClockDto }>(
      `/performance-analysis/sessions/${sessionId}/live-clock`,
      body,
    );
    setClock(data.liveClock);
  }

  function captureVideoMs(): number | null {
    const fromYt = readYoutubeTimeMs(youtubePlayer);
    if (fromYt != null) return fromYt;
    const fromVideo = readHtml5TimeMs(videoRef, clock?.videoSyncOffsetMs ?? 0);
    if (fromVideo != null) return fromVideo;
    return null;
  }

  function stampNow() {
    const vid = captureVideoMs();
    return {
      startMs: vid ?? clock?.videoSyncOffsetMs ?? 0,
      matchClockSeconds: clock?.effectiveClockSeconds ?? 0,
      matchPeriod: clock?.period ?? "1T",
      videoTimeUnknown: vid == null && !youtubeVideoId && !streamPath,
    };
  }

  async function captureTagStamp(tag: AnalysisTagDefinition, side: "proprio" | "adversario") {
    if (!clock) return;
    const stamp = stampNow();
    const outcomes = parseTagOutcomes(tag.outcomes);
    const qualifiers = parseStringList(tag.qualifiers);
    const needsOutcome = outcomes.length > 1;
    const needsQualifier = qualifiers.length > 1;
    const needsPlayer = Boolean(tag.requiresPlayer);
    const needsField = Boolean((tag as { requiresFieldLocation?: boolean }).requiresFieldLocation);

    const clientEventKey = analysisEventQueue.enqueue({
      tenantId,
      sessionId,
      capturedAtMs: Date.now(),
      payload: {
        tagDefinitionId: tag.id,
        teamSide: side,
        outcome: needsOutcome ? null : outcomes[0] ?? "neutro",
        startMs: stamp.startMs ?? 0,
        matchPeriod: stamp.matchPeriod,
        matchClockSeconds: stamp.matchClockSeconds,
        videoSourceId: activeVideo?.id ?? null,
        liveCaptureStamp: true,
        source: "LIVE",
      },
    });

    const pending: PendingCapture = {
      clientEventKey,
      tag,
      stampedStartMs: stamp.startMs,
      stampedMatchClock: stamp.matchClockSeconds,
      teamSide: side,
      needsPlayer,
      needsField,
      needsOutcome,
      needsQualifier,
    };
    setSelectedQualifier("");
    setSelectedOutcome("");
    setPendingCapture(pending);

  if (!needsPlayer && !needsField && !needsOutcome && !needsQualifier) {
      setPendingCapture(null);
    }
    window.setTimeout(() => void reloadEvents(), 600);
  }

  async function finishPendingCapture(outcome?: string) {
    if (!pendingCapture) return;
    const patch: Record<string, unknown> = {};
    if (outcome || selectedOutcome) patch.outcome = outcome ?? selectedOutcome;
    if (selectedQualifier) patch.eventQualifier = selectedQualifier;
    if (teamSide === "proprio" && selectedPlayerId) {
      patch.playerId = selectedPlayerId;
    }
    if (teamSide === "adversario" && selectedOpponentPlayerId) {
      patch.opponentPlayerId = selectedOpponentPlayerId;
    }
    if (selectedZone) {
      patch.fieldZoneKey = selectedZone;
    } else if (fieldXY) {
      patch.fieldX = fieldXY.x;
      patch.fieldY = fieldXY.y;
      patch.fieldZoneKey = resolvePitchZoneFromXY(fieldXY.x, fieldXY.y);
    }

    const item = analysisEventQueue.getSnapshot().find((q) => q.clientEventKey === pendingCapture.clientEventKey);
    if (item?.serverEventId) {
      await api.patch(`/performance-analysis/events/${item.serverEventId}`, patch);
    } else {
      analysisEventQueue.patchPayload(pendingCapture.clientEventKey, patch);
    }
    if (selectedPlayerId) lastPlayerRef.current = selectedPlayerId;
    setPendingCapture(null);
    setSelectedZone(null);
    setFieldXY(null);
    await reloadEvents();
  }

  async function transitionPossession(target: "our" | "opponent" | "out") {
    if (!clock) return;
    const stamp = stampNow();
    await api.post(`/performance-analysis/sessions/${sessionId}/possession-transition`, {
      target,
      startMs: stamp.startMs,
      matchPeriod: stamp.matchPeriod,
      matchClockSeconds: stamp.matchClockSeconds,
      videoSourceId: activeVideo?.id ?? null,
      clientEventKey: `pos-${target}-${stamp.startMs}`,
    });
    await reloadEvents();
  }

  async function undoLast() {
    const q = await analysisEventQueue.undoQueuedOrSynced(sessionId);
    if (q === "none") {
      await api.post(`/performance-analysis/sessions/${sessionId}/events/undo`, {});
    }
    await reloadEvents();
  }

  function togglePlayPause() {
    if (youtubePlayer && videoCaps.canPlayPause) {
      const st = youtubePlayer.getPlayerState();
      if (st === "playing") youtubePlayer.pause();
      else youtubePlayer.play();
      return;
    }
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  function seekVideoMs(ms: number) {
    if (youtubePlayer && videoCaps.canSeek) {
      youtubePlayer.seekToMs(ms);
      return;
    }
    const el = videoRef.current;
    if (el) el.currentTime = ms / 1000;
  }

  function toggleExpanded() {
    setExpanded((v) => !v);
    if (!expanded && workspaceRef.current?.requestFullscreen) {
      void workspaceRef.current.requestFullscreen().catch(() => undefined);
    } else if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }

  const tagsByGroup = useMemo(() => {
    const groups = new Map<string, AnalysisTagDefinition[]>();
    for (const t of detail?.tags ?? []) {
      const g = t.tagGroup || t.category || "Geral";
      const list = groups.get(g) ?? [];
      list.push(t);
      groups.set(g, list);
    }
    for (const [, list] of groups) list.sort((a, b) => a.sortOrder - b.sortOrder);
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [detail?.tags]);

  const activePossession = useMemo(() => {
    const keys = {
      state_posse_proprio: ourTeamLabel,
      state_posse_adversario: opponentTeamLabel,
      state_bola_fora: "Bola fora",
    } as const;
    const open = [...events]
      .reverse()
      .find((e) => e.tagDefinition?.key && e.tagDefinition.key in keys && e.endMs == null);
    if (!open?.tagDefinition?.key) return null;
    const label = keys[open.tagDefinition.key as keyof typeof keys];
    const elapsedSec =
      open.matchClockSeconds != null && clock?.effectiveClockSeconds != null
        ? Math.max(0, clock.effectiveClockSeconds - open.matchClockSeconds)
        : null;
    return { label, elapsedSec, eventId: open.id };
  }, [events, clock?.effectiveClockSeconds, ourTeamLabel, opponentTeamLabel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isFocusProtectedTarget(e.target) || isEditableTarget(e.target)) return;
      if (e.key === " " && videoCaps.canPlayPause) {
        e.preventDefault();
        togglePlayPause();
        return;
      }
      if (shouldIgnoreKeyRepeat(e)) return;
      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        void undoLast();
        return;
      }
      const posKey = e.key as keyof typeof DEFAULT_POSSESSION_SHORTCUTS;
      if (DEFAULT_POSSESSION_SHORTCUTS[posKey]) {
        e.preventDefault();
        void transitionPossession(DEFAULT_POSSESSION_SHORTCUTS[posKey]);
        return;
      }
      if (!detail?.tags) return;
      const key = e.key.toLowerCase();
      const tag = detail.tags.find((t) => t.shortcutKey === key);
      if (tag) {
        e.preventDefault();
        void captureTagStamp(tag, teamSide);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail?.tags, teamSide, clock, videoCaps.canPlayPause]);

  const queue = analysisEventQueue.getForSession(sessionId);
  const pendingCount = queueTick >= 0 ? queue.filter((q) => q.status === "pending" || q.status === "syncing").length : 0;
  const failed = queue.filter((q) => q.status === "failed");

  if (loading && !detail) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      ref={workspaceRef}
      className={cn(
        "flex min-h-0 flex-col gap-3",
        expanded && "fixed inset-0 z-50 bg-background p-3",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{detail?.session.title}</p>
          <p className="text-xs text-muted-foreground">
            {PERIOD_LABELS[clock?.period ?? "1T"] ?? clock?.period} · {clock?.display ?? "0:00"}
            {pendingCount > 0 ? ` · ${pendingCount} pendente(s)` : ""}
            {possession?.ourPossessionPct != null
              ? ` · Posse ${possession.ourPossessionPct}%`
              : ""}
          </p>
          {activePossession ? (
            <p className="text-xs font-medium text-violet-300">
              Estado: {activePossession.label}
              {activePossession.elapsedSec != null
                ? ` · ${formatClockDisplay(activePossession.elapsedSec)}`
                : ""}
            </p>
          ) : null}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={toggleExpanded}>
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {expanded ? "Sair" : "Expandir"}
        </Button>
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
        <Button size="sm" variant="outline" type="button" onClick={() => setShowSidePanel((v) => !v)}>
          {showSidePanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Métricas / timeline
        </Button>
      </div>

      <div className="space-y-2">
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-lg border border-border bg-black",
            expanded ? "min-h-[55vh]" : "aspect-video max-h-[62vh] min-h-[280px]",
          )}
        >
          {youtubeVideoId ? (
            <div ref={youtubeContainerRef} className="h-full w-full" />
          ) : streamPath ? (
            <>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                src={streamPath}
                className="h-full w-full"
                onRateChange={(e) => setPlaybackRate(e.currentTarget.playbackRate)}
              />
              <AnalysisVideoTelestrationCanvas
                videoRef={videoRef}
                toolActive={drawToolActive}
                strokes={drawStrokes}
                setStrokes={setDrawStrokes}
              />
            </>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center p-4 text-center text-xs text-muted-foreground">
              Live Tag funciona sem vídeo. Use o relógio de partida para marcar tempo.
            </div>
          )}
        </div>

        {streamPath || youtubeVideoId ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={togglePlayPause} disabled={!videoCaps.canPlayPause}>
              <Play className="mr-1 h-3 w-3" />
              Play / Pause
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!videoCaps.canSeek}
              onClick={() => {
                const cur = captureVideoMs();
                if (cur == null) return;
                seekVideoMs(Math.max(0, cur - 5000));
              }}
            >
              −5s
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!videoCaps.canSeek}
              onClick={() => {
                const cur = captureVideoMs();
                if (cur == null) return;
                seekVideoMs(cur + 5000);
              }}
            >
              +5s
            </Button>
            {streamPath ? (
              <NativeSelectPlaybackRate
                value={playbackRate}
                onChange={(rate) => {
                  const el = videoRef.current;
                  if (el) el.playbackRate = rate;
                  setPlaybackRate(rate);
                }}
              />
            ) : null}
            <span className="text-xs text-muted-foreground tabular-nums">
              Vídeo:{" "}
              {(() => {
                const v = captureVideoMs();
                return v != null
                  ? formatClockDisplay(Math.floor(v / 1000))
                  : videoCaps.unavailableReason ?? "Sem tempo de vídeo";
              })()}
            </span>
            {streamPath && activeVideo?.id ? (
              <>
                <AnalysisVideoTelestrationToolbar
                  sessionId={sessionId}
                  videoSourceId={activeVideo.id}
                  videoRef={videoRef}
                  toolActive={drawToolActive}
                  setToolActive={setDrawToolActive}
                  strokes={drawStrokes}
                  setStrokes={setDrawStrokes}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDrawEvent(null);
                    setDrawOpen(true);
                  }}
                >
                  Desenho tático
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {pendingCapture ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium">
            Completar: {pendingCapture.tag.label} ·{" "}
            {formatClockDisplay(pendingCapture.stampedMatchClock)}
          </p>
          {pendingCapture.needsPlayer ? (
            <p className="text-xs text-muted-foreground">Selecione o jogador abaixo.</p>
          ) : null}
          {pendingCapture.needsField ? (
            <p className="text-xs text-muted-foreground">Selecione o campo abaixo.</p>
          ) : null}
          {pendingCapture.needsOutcome ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {parseTagOutcomes(pendingCapture.tag.outcomes).map((o) => (
                <Button
                  key={o}
                  size="sm"
                  type="button"
                  variant={selectedOutcome === o ? "default" : "outline"}
                  onClick={() => setSelectedOutcome(o)}
                >
                  {labelOutcome(o)}
                </Button>
              ))}
            </div>
          ) : null}
          {pendingCapture.needsQualifier ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {parseStringList(pendingCapture.tag.qualifiers).map((q) => (
                <Button
                  key={q}
                  size="sm"
                  type="button"
                  variant={selectedQualifier === q ? "default" : "outline"}
                  onClick={() => setSelectedQualifier(q)}
                >
                  {labelQualifier(q)}
                </Button>
              ))}
            </div>
          ) : null}
          {(pendingCapture.needsOutcome || pendingCapture.needsQualifier) &&
          !(pendingCapture.needsPlayer || pendingCapture.needsField) ? (
            <Button
              className="mt-2"
              size="sm"
              type="button"
              disabled={
                (pendingCapture.needsOutcome && !selectedOutcome) ||
                (pendingCapture.needsQualifier && !selectedQualifier)
              }
              onClick={() => void finishPendingCapture(selectedOutcome || "neutro")}
            >
              Concluir
            </Button>
          ) : !pendingCapture.needsOutcome && !pendingCapture.needsQualifier ? (
            <Button className="mt-2" size="sm" type="button" onClick={() => void finishPendingCapture()}>
              Concluir
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded-lg border border-border p-3 space-y-2 min-h-[220px]">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Jogadores</p>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={teamSide === "proprio" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setTeamSide("proprio")}
            >
              {ourTeamLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={teamSide === "adversario" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setTeamSide("adversario")}
            >
              {opponentTeamLabel}
            </Button>
          </div>
          {teamSide === "proprio" ? (
            <>
              <Input
                placeholder="Buscar ou nº…"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="text-foreground h-9"
              />
              <div className="max-h-44 overflow-y-auto grid grid-cols-2 gap-1">
                {filteredRoster.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={cn(
                      "rounded border px-2 py-2 text-left text-xs min-h-[44px]",
                      selectedPlayerId === p.id ? "border-primary bg-primary/10" : "border-border",
                    )}
                    onClick={() => {
                      setSelectedPlayerId(p.id);
                      if (pendingCapture?.needsPlayer && !pendingCapture.needsOutcome) void finishPendingCapture();
                    }}
                  >
                    <span className="font-bold text-amber-400">{p.jerseyNumber ?? "—"}</span> {p.name}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <Input
                placeholder="Buscar adversário…"
                value={opponentSearch}
                onChange={(e) => setOpponentSearch(e.target.value)}
                className="text-foreground h-9"
              />
              <div className="max-h-44 overflow-y-auto grid grid-cols-2 gap-1">
                {filteredOpponent.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={cn(
                      "rounded border px-2 py-2 text-left text-xs min-h-[44px]",
                      selectedOpponentPlayerId === p.id ? "border-primary bg-primary/10" : "border-border",
                    )}
                    onClick={() => {
                      setSelectedOpponentPlayerId(p.id);
                      if (pendingCapture?.needsPlayer && !pendingCapture.needsOutcome) void finishPendingCapture();
                    }}
                  >
                    <span className="font-bold text-amber-400">{p.jerseyNumber ?? "—"}</span> {p.name}
                  </button>
                ))}
              </div>
            </>
          )}
          <Button type="button" size="sm" variant="ghost" className="w-full" onClick={() => {
            setSelectedPlayerId("");
            setSelectedOpponentPlayerId("");
          }}>
            Limpar seleção
          </Button>
        </section>

        <section className="rounded-lg border border-border p-3 space-y-2 min-h-[220px] max-h-[360px] overflow-y-auto">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Ações / tags</p>
          {tagsByGroup.map(([group, tags]) => (
            <div key={group} className="space-y-1">
              <p className="text-[10px] text-muted-foreground">{group}</p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {tags.map((tag) => (
                  <Button
                    key={tag.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-auto min-h-[44px] flex-col py-2 text-xs"
                    style={tag.color ? { borderColor: tag.color } : undefined}
                    onClick={() => void captureTagStamp(tag, teamSide)}
                  >
                    <span>{tag.label}</span>
                    {tag.shortcutKey ? (
                      <span className="text-[10px] opacity-70">{tag.shortcutKey.toUpperCase()}</span>
                    ) : null}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-1 pt-2 border-t border-border">
            <Button type="button" size="sm" onClick={() => void transitionPossession("our")}>
              1 · {ourTeamLabel}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => void transitionPossession("opponent")}>
              2 · {opponentTeamLabel}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void transitionPossession("out")}>
              3 · Bola parada
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border p-3 space-y-2 min-h-[220px]">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Campo</p>
          <AnalysisPitchMap
            className="max-w-none w-full"
            points={events
              .filter((e) => e.fieldX != null && e.fieldY != null)
              .slice(-8)
              .map((e) => ({
                eventId: e.id,
                x: e.fieldX!,
                y: e.fieldY!,
                fieldZoneKey: e.fieldZoneKey,
                label: e.tagDefinition?.label,
              }))}
            selectedZone={selectedZone}
            onPickZone={(zone) => {
              setSelectedZone(zone);
              setFieldXY(null);
              if (pendingCapture?.needsField && !pendingCapture.needsOutcome) void finishPendingCapture();
            }}
            onPick={(x, y) => {
              setFieldXY({ x, y });
              setSelectedZone(resolvePitchZoneFromXY(x, y));
              if (pendingCapture?.needsField && !pendingCapture.needsOutcome) void finishPendingCapture();
            }}
            showZoneLabels
          />
          {selectedZone ? (
            <p className="text-xs text-muted-foreground">Zona: {labelPitchZone(selectedZone)}</p>
          ) : null}
        </section>
      </div>

      {showSidePanel ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          {metrics ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <KpiCard label="Passes" value={`${metrics.passSuccess}/${metrics.passAttempts}`} />
              <KpiCard label="Finalizações" value={metrics.shots} />
              <KpiCard label="Gols" value={metrics.goals ?? 0} />
            </div>
          ) : null}
          {failed.length > 0 ? (
            <div className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs lg:col-span-2">
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
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border lg:col-span-2">
            <p className="sticky top-0 border-b border-border bg-background px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
              Timeline
            </p>
            <ul className="divide-y divide-border">
              {[...events].reverse().slice(0, 40).map((ev) => (
                <li key={ev.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                  <span className="font-medium">
                    {ev.matchClockSeconds != null ? formatClockDisplay(ev.matchClockSeconds) : "—"} ·{" "}
                    {ev.tagDefinition?.label}
                    {eventAnnotationIds[ev.id] ? " · ✎" : ""}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      seekVideoMs(ev.startMs);
                      setDrawEvent(ev);
                      setDrawOpen(true);
                    }}
                  >
                    Desenhar jogada
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {activeVideo?.id ? (
        <AnalysisTacticalDrawDialog
          open={drawOpen}
          onOpenChange={setDrawOpen}
          sessionId={sessionId}
          videoSourceId={activeVideo.id}
          startMs={drawEvent?.startMs ?? captureVideoMs() ?? 0}
          analysisEventId={drawEvent?.id ?? null}
          annotationId={drawEvent ? eventAnnotationIds[drawEvent.id] : null}
          onSaved={async () => {
            if (drawEvent) {
              const { data } = await api.get(`/performance-analysis/events/${drawEvent.id}/video-annotation`);
              if (data && typeof data === "object" && "id" in data) {
                setEventAnnotationIds((m) => ({ ...m, [drawEvent.id]: String((data as { id: string }).id) }));
              }
            }
          }}
        />
      ) : null}

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

function NativeSelectPlaybackRate({
  value,
  onChange,
}: {
  value: number;
  onChange: (rate: number) => void;
}) {
  return (
    <select
      className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
        <option key={r} value={r}>
          {r}×
        </option>
      ))}
    </select>
  );
}
