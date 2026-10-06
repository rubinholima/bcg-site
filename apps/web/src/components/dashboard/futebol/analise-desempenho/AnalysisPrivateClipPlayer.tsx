"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { youtubeEmbedUrl, type AnalysisVideoSourcePublic } from "@/lib/performance-analysis-types";

type PlaybackPayload = {
  clip: { id: string; title: string; startMs: number; endMs: number; notes?: string | null };
  videoSource: AnalysisVideoSourcePublic;
};

type Props = {
  clipId: string;
  compact?: boolean;
  autoPlay?: boolean;
};

export function AnalysisPrivateClipPlayer({ clipId, compact, autoPlay }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<PlaybackPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<PlaybackPayload>(`/performance-analysis/clips/${clipId}/playback`);
      setPayload(data);
    } catch {
      setError("Não foi possível carregar o clip.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [clipId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !payload?.clip) return;
    const onMeta = () => {
      el.currentTime = payload.clip.startMs / 1000;
      if (autoPlay) void el.play().catch(() => undefined);
    };
    const onTime = () => {
      if (el.currentTime * 1000 >= payload.clip.endMs) {
        el.pause();
      }
    };
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("timeupdate", onTime);
    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("timeupdate", onTime);
    };
  }, [payload, autoPlay]);

  if (loading) {
    return (
      <div className={compact ? "flex items-center gap-2 py-2 text-sm text-muted-foreground" : "py-8"}>
        <Loader2 className="h-5 w-5 animate-spin" />
        {!compact ? <span className="text-sm text-muted-foreground">Carregando vídeo…</span> : null}
      </div>
    );
  }

  if (error || !payload) {
    return <p className="text-sm text-destructive">{error ?? "Clip indisponível."}</p>;
  }

  const vs = payload.videoSource;
  const embed = youtubeEmbedUrl(vs.externalUrl);
  const streamPath = vs.streamUrl ? `/api${vs.streamUrl}` : null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{payload.clip.title}</p>
      {embed ? (
        <div className="aspect-video w-full max-w-2xl overflow-hidden rounded-md border border-border bg-black">
          <iframe
            title={payload.clip.title}
            src={embed}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : streamPath ? (
        <video
          ref={videoRef}
          src={streamPath}
          controls
          playsInline
          className="aspect-video w-full max-w-2xl rounded-md border border-border bg-black"
        />
      ) : vs.externalUrl ? (
        <a
          href={vs.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-violet-300 underline"
        >
          Abrir fonte externa
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">Fonte de vídeo não disponível para reprodução inline.</p>
      )}
      {payload.clip.notes ? (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{payload.clip.notes}</p>
      ) : null}
    </div>
  );
}
