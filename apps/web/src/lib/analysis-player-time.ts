import type { RefObject } from "react";

export type VideoTimeCapabilities = {
  canReadCurrentTime: boolean;
  canSeek: boolean;
  canPlayPause: boolean;
  canPlaybackRate: boolean;
  canFullscreen: boolean;
  source: "html5" | "youtube" | "none";
  unavailableReason?: string;
};

export function getVideoTimeCapabilities(
  hasHtml5: boolean,
  hasYoutubeEmbed: boolean,
): VideoTimeCapabilities {
  if (hasHtml5) {
    return {
      source: "html5",
      canReadCurrentTime: true,
      canSeek: true,
      canPlayPause: true,
      canPlaybackRate: true,
      canFullscreen: typeof document !== "undefined" && Boolean(document.documentElement?.requestFullscreen),
    };
  }
  if (hasYoutubeEmbed) {
    return {
      source: "youtube",
      canReadCurrentTime: false,
      canSeek: false,
      canPlayPause: false,
      canPlaybackRate: false,
      canFullscreen: true,
      unavailableReason: "Tempo do YouTube não integrado neste modo — use relógio de partida ou HTML5.",
    };
  }
  return {
    source: "none",
    canReadCurrentTime: false,
    canSeek: false,
    canPlayPause: false,
    canPlaybackRate: false,
    canFullscreen: false,
    unavailableReason: "Sem fonte de vídeo.",
  };
}

export function readHtml5TimeMs(videoRef: RefObject<HTMLVideoElement | null>, videoSyncOffsetMs: number): number | null {
  const el = videoRef.current;
  if (!el || !Number.isFinite(el.currentTime)) return null;
  return Math.round(el.currentTime * 1000) + videoSyncOffsetMs;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return Boolean(target.closest("[contenteditable='true'], [role='textbox'], [data-skip-live-shortcuts='true']"));
}
