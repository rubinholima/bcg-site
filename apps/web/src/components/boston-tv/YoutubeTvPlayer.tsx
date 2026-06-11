"use client";

import { useEffect, useMemo, useRef } from "react";

interface YoutubeTvPlayerProps {
  videoId: string;
  itemKey: string;
  /** Segundo inicial ao abrir o item. */
  startSeconds?: number;
  /** Segundo alvo do Hall — corrige drift sem recarregar iframe. */
  syncTargetSeconds?: number;
  paused?: boolean;
}

function requestPageFullscreen(): void {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => void;
  };
  if (el.requestFullscreen) {
    void el.requestFullscreen().catch(() => {});
    return;
  }
  el.webkitRequestFullscreen?.();
}

function buildEmbedSrc(videoId: string, startSeconds: number): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    rel: "0",
    fs: "1",
    controls: "0",
    modestbranding: "1",
    playsinline: "1",
    iv_load_policy: "3",
    disablekb: "1",
    enablejsapi: "1",
    origin: typeof window !== "undefined" ? window.location.origin : "",
  });
  if (startSeconds > 0) {
    params.set("start", String(startSeconds));
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

function ytCommand(iframe: HTMLIFrameElement, func: string, args: unknown[] = []) {
  iframe.contentWindow?.postMessage(
    JSON.stringify({ event: "command", func, args }),
    "*",
  );
}

export function YoutubeTvPlayer({
  videoId,
  itemKey,
  startSeconds = 0,
  syncTargetSeconds,
  paused = false,
}: YoutubeTvPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startAtRef = useRef(startSeconds);
  const lastItemKeyRef = useRef(itemKey);
  const lastSeekRef = useRef(-1);

  if (lastItemKeyRef.current !== itemKey) {
    lastItemKeyRef.current = itemKey;
    startAtRef.current = startSeconds;
    lastSeekRef.current = -1;
  }

  const embedSrc = useMemo(
    () => buildEmbedSrc(videoId, startAtRef.current),
    [videoId, itemKey],
  );

  useEffect(() => {
    const t = window.setTimeout(requestPageFullscreen, 400);
    return () => window.clearTimeout(t);
  }, [itemKey]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    ytCommand(iframe, paused ? "pauseVideo" : "playVideo");
  }, [paused, itemKey]);

  useEffect(() => {
    if (paused || syncTargetSeconds == null) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const target = Math.max(0, Math.floor(syncTargetSeconds));
    if (Math.abs(target - lastSeekRef.current) < 3) return;

    lastSeekRef.current = target;
    ytCommand(iframe, "seekTo", [target, true]);
  }, [syncTargetSeconds, paused, itemKey]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <iframe
        ref={iframeRef}
        key={itemKey}
        title="BCG TV — YouTube"
        className="absolute inset-0 h-full w-full border-0"
        src={embedSrc}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
