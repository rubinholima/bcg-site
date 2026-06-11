"use client";

import { useEffect, useRef } from "react";

interface YoutubeTvPlayerProps {
  videoId: string;
  /** Muda quando troca o item — dispara nova tentativa de tela cheia. */
  itemKey: string;
  /** Segundo inicial (Canal Hall sincronizado). */
  startSeconds?: number;
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

export function YoutubeTvPlayer({ videoId, itemKey, startSeconds = 0 }: YoutubeTvPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(requestPageFullscreen, 400);
    return () => window.clearTimeout(t);
  }, [itemKey]);

  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    rel: "0",
    fs: "1",
    controls: "0",
    modestbranding: "1",
    playsinline: "0",
    iv_load_policy: "3",
    disablekb: "1",
  });
  if (startSeconds > 0) {
    params.set("start", String(startSeconds));
  }

  return (
    <div ref={rootRef} className="relative h-screen w-screen overflow-hidden bg-black">
      <iframe
        key={itemKey}
        title="BCG TV — YouTube"
        className="absolute inset-0 h-full w-full border-0"
        src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
