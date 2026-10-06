"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import {
  type AnalysisEventRow,
  type AnalysisSessionDetail,
  type AnalysisTagDefinition,
  formatMs,
  parseTagOutcomes,
  youtubeEmbedUrl,
} from "@/lib/performance-analysis-types";

interface PlayerOption {
  id: string;
  name: string;
}

interface Props {
  sessionId: string;
  tenantId: string;
  category?: string;
}

export function PerformanceAnalysisTaggingWorkspace({ sessionId, tenantId, category }: Props) {
  const [detail, setDetail] = useState<AnalysisSessionDetail | null>(null);
  const [events, setEvents] = useState<AnalysisEventRow[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoSourceId, setVideoSourceId] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [outcome, setOutcome] = useState("");
  const [startMs, setStartMs] = useState(0);
  const [notes, setNotes] = useState("");
  const [matchPeriod, setMatchPeriod] = useState("1T");
  const [matchClockSeconds, setMatchClockSeconds] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: sess }, { data: evs }] = await Promise.all([
        api.get<AnalysisSessionDetail>(`/performance-analysis/sessions/${sessionId}`),
        api.get<AnalysisEventRow[]>(`/performance-analysis/sessions/${sessionId}/events`),
      ]);
      setDetail(sess);
      setEvents(Array.isArray(evs) ? evs : []);
      if (!videoSourceId && sess.videoSources[0]?.id) {
        setVideoSourceId(sess.videoSources[0].id);
      }
      if (!selectedTagId && sess.tags[0]?.id) {
        setSelectedTagId(sess.tags[0].id);
      }
    } catch (err) {
      setFeedback({
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível carregar a sessão.",
      });
    } finally {
      setLoading(false);
    }
  }, [sessionId, selectedTagId, videoSourceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<PlayerOption[]>(`/players?${params}`)
      .then(({ data }) => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => setPlayers([]));
  }, [tenantId, category]);

  const activeSource = useMemo(
    () => detail?.videoSources.find((v) => v.id === videoSourceId) ?? detail?.videoSources[0] ?? null,
    [detail, videoSourceId],
  );

  const selectedTag: AnalysisTagDefinition | undefined = detail?.tags.find((t) => t.id === selectedTagId);
  const outcomeOptions = parseTagOutcomes(selectedTag?.outcomes);

  const syncTimeFromVideo = useCallback(() => {
    const el = videoRef.current;
    if (el) setStartMs(Math.round(el.currentTime * 1000));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " ") {
        e.preventDefault();
        syncTimeFromVideo();
      }
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTagId, playerId, outcome, startMs, notes, videoSourceId]);

  async function handleSave() {
    if (!selectedTagId) return;
    setSaving(true);
    try {
      const clock = matchClockSeconds.trim() ? Number(matchClockSeconds) : null;
      await api.post(`/performance-analysis/sessions/${sessionId}/events`, {
        videoSourceId: activeSource?.id ?? null,
        tagDefinitionId: selectedTagId,
        playerId: playerId || null,
        outcome: outcome || null,
        startMs,
        matchPeriod,
        matchClockSeconds: Number.isFinite(clock) ? clock : null,
        notes: notes.trim() || null,
        source: "MANUAL",
        clientEventKey: `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
      setNotes("");
      const { data: evs } = await api.get<AnalysisEventRow[]>(
        `/performance-analysis/sessions/${sessionId}/events`,
      );
      setEvents(Array.isArray(evs) ? evs : []);
    } catch (err) {
      setFeedback({
        title: "Erro ao marcar",
        message: err instanceof Error ? err.message : "Falha ao salvar evento.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(eventId: string) {
    try {
      await api.delete(`/performance-analysis/events/${eventId}`);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      setFeedback({
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível excluir.",
      });
    }
  }

  if (loading && !detail) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-sm text-muted-foreground">Sessão indisponível.</p>;
  }

  const embed = youtubeEmbedUrl(activeSource?.externalUrl);
  const streamPath = activeSource?.streamUrl ? `/api${activeSource.streamUrl}` : null;

  return (
    <div className="mt-4 flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-3">
        {detail.videoSources.length > 1 ? (
          <NativeSelectField
            value={videoSourceId}
            onChange={(e) => setVideoSourceId(e.target.value)}
            options={detail.videoSources.map((v) => ({
              value: v.id,
              label: v.cameraLabel ? `${v.title} (${v.cameraLabel})` : v.title,
            }))}
          />
        ) : null}

        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
          {embed ? (
            <iframe
              title={activeSource?.title ?? "Vídeo"}
              src={embed}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          ) : streamPath ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video ref={videoRef} src={streamPath} controls className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
              {activeSource?.sourceType === "UPLOAD" && !activeSource.hasPrivateUpload
                ? "Envie o vídeo na sessão para iniciar a marcação."
                : "Nenhuma fonte de vídeo disponível."}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Tempo vídeo: {formatMs(startMs)}</span>
          <Button type="button" variant="secondary" size="sm" onClick={syncTimeFromVideo}>
            Capturar tempo (Space)
          </Button>
        </div>
      </div>

      <div className="w-full shrink-0 space-y-4 lg:w-[380px] xl:w-[420px]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
          {detail.tags.map((tag) => (
            <Button
              key={tag.id}
              type="button"
              variant={selectedTagId === tag.id ? "default" : "outline"}
              size="sm"
              className="h-auto min-h-[44px] whitespace-normal py-2 text-left"
              onClick={() => {
                setSelectedTagId(tag.id);
                setOutcome("");
              }}
            >
              {tag.label}
            </Button>
          ))}
        </div>

        {outcomeOptions.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {outcomeOptions.map((o) => (
              <Button
                key={o}
                type="button"
                size="sm"
                variant={outcome === o ? "default" : "outline"}
                onClick={() => setOutcome(o)}
              >
                {o.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        ) : null}

        <NativeSelectField
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          placeholder="Atleta (opcional)"
          options={[
            { value: "", label: "Sem atleta" },
            ...players.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />

        <div className="grid grid-cols-2 gap-2">
          <NativeSelectField
            value={matchPeriod}
            onChange={(e) => setMatchPeriod(e.target.value)}
            options={[
              { value: "1T", label: "1º tempo" },
              { value: "2T", label: "2º tempo" },
              { value: "INT", label: "Intervalo" },
              { value: "PR", label: "Prorrogação" },
            ]}
          />
          <Input
            type="number"
            min={0}
            placeholder="Relógio (s)"
            className="text-foreground"
            value={matchClockSeconds}
            onChange={(e) => setMatchClockSeconds(e.target.value)}
          />
        </div>

        <Textarea
          placeholder="Notas rápidas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <Button type="button" className="w-full" disabled={saving} onClick={() => void handleSave()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Registrar ação (Ctrl+Enter)
        </Button>

        <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border">
          <p className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Timeline recente
          </p>
          <ul className="divide-y divide-border">
            {[...events].reverse().slice(0, 40).map((ev) => (
              <li key={ev.id} className="flex items-start gap-2 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {ev.tagDefinition?.label ?? "Ação"} · {formatMs(ev.startMs)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[ev.player?.name, ev.outcome].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => void handleDelete(ev.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
            {events.length === 0 ? (
              <li className="px-3 py-4 text-sm text-muted-foreground">Nenhum evento ainda.</li>
            ) : null}
          </ul>
        </div>
      </div>

      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}
