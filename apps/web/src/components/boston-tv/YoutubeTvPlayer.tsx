"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

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
    origin: "https://www.bostoncitygroup.biz",
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
  const readyRef = useRef(false);

  if (lastItemKeyRef.current !== itemKey) {
    lastItemKeyRef.current = itemKey;
    startAtRef.current = startSeconds;
    lastSeekRef.current = -1;
    readyRef.current = false;
  }

  const embedSrc = useMemo(
    () => buildEmbedSrc(videoId, startAtRef.current),
    [videoId, itemKey],
  );

  const applyPlayback = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !readyRef.current) return;
    ytCommand(iframe, paused ? "pauseVideo" : "playVideo");
  }, [paused]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return;
      try {
        const raw = event.data;
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (
          data?.event === "onReady" ||
          data?.info?.playerState === 1 ||
          data?.info?.playerState === 3
        ) {
          readyRef.current = true;
          applyPlayback();
        }
      } catch {
        /* ignore non-JSON messages */
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [applyPlayback]);

  useEffect(() => {
    const t = window.setTimeout(requestPageFullscreen, 400);
    return () => window.clearTimeout(t);
  }, [itemKey]);

  useEffect(() => {
    applyPlayback();
  }, [applyPlayback, itemKey]);

  useEffect(() => {
    if (paused) return;
    const retry = window.setInterval(() => {
      if (!paused && readyRef.current) {
        applyPlayback();
      }
    }, 2500);
    return () => window.clearInterval(retry);
  }, [paused, applyPlayback, itemKey]);

  useEffect(() => {
    if (paused || syncTargetSeconds == null) return;
    const iframe = iframeRef.current;
    if (!iframe || !readyRef.current) return;

    const target = Math.max(0, Math.floor(syncTargetSeconds));
    if (Math.abs(target - lastSeekRef.current) < 5) return;

    lastSeekRef.current = target;
    ytCommand(iframe, "seekTo", [target, true]);
  }, [syncTargetSeconds, paused, itemKey]);

  const handleIframeLoad = () => {
    readyRef.current = true;
    window.setTimeout(() => applyPlayback(), 300);
    window.setTimeout(() => applyPlayback(), 1200);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <iframe
        ref={iframeRef}
        key={itemKey}
        title="BCG TV — YouTube"
        className="absolute inset-0 h-full w-full border-0"
        src={embedSrc}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        onLoad={handleIframeLoad}
      />
    </div>
  );
}
