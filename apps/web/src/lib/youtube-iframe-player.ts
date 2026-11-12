/** YouTube IFrame Player API — tempo real sem retornar zero fictício. */

export type YoutubePlayerState = "unstarted" | "ended" | "playing" | "paused" | "buffering" | "cued";

export type YoutubePlayerHandle = {
  getCurrentTimeMs: () => number | null;
  play: () => void;
  pause: () => void;
  seekToMs: (ms: number) => void;
  getPlaybackRate: () => number | null;
  setPlaybackRate: (rate: number) => void;
  getPlayerState: () => YoutubePlayerState | null;
  destroy: () => void;
};

type YTPlayer = {
  getCurrentTime: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getPlayerState: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, string | number>;
          events?: { onReady?: () => void; onError?: () => void };
        },
      ) => YTPlayer;
      PlayerState: Record<string, number>;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

function loadYoutubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => reject(new Error("Falha ao carregar YouTube API"));
      document.head.appendChild(s);
    }
    window.setTimeout(() => {
      if (window.YT?.Player) resolve();
    }, 8000);
  });
  return apiLoadPromise;
}

export function extractYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  const m =
    u.match(/[?&]v=([\w-]{11})/) ||
    u.match(/youtu\.be\/([\w-]{11})/) ||
    u.match(/embed\/([\w-]{11})/);
  return m?.[1] ?? null;
}

export async function createYoutubePlayer(
  container: HTMLElement,
  videoId: string,
  offsetMs = 0,
): Promise<YoutubePlayerHandle> {
  await loadYoutubeApi();
  if (!window.YT?.Player) {
    throw new Error("YouTube IFrame API indisponível neste ambiente.");
  }
  const player = await new Promise<YTPlayer>((resolve, reject) => {
    try {
      new window.YT!.Player(container, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { enablejsapi: 1, origin: window.location.origin, playsinline: 1 },
        events: {
          onReady: ((ev: { target: YTPlayer }) => resolve(ev.target)) as () => void,
          onError: () => reject(new Error("YouTube player error")),
        },
      });
    } catch (e) {
      reject(e);
    }
  });

  if (offsetMs > 0) player.seekTo(offsetMs / 1000, true);

  const stateMap: Record<number, YoutubePlayerState> = {
    [-1]: "unstarted",
    0: "ended",
    1: "playing",
    2: "paused",
    3: "buffering",
    5: "cued",
  };

  return {
    getCurrentTimeMs: () => {
      try {
        const t = player.getCurrentTime();
        if (!Number.isFinite(t) || t < 0) return null;
        return Math.round(t * 1000) + offsetMs;
      } catch {
        return null;
      }
    },
    play: () => player.playVideo(),
    pause: () => player.pauseVideo(),
    seekToMs: (ms) => player.seekTo(Math.max(0, (ms - offsetMs) / 1000), true),
    getPlaybackRate: () => {
      try {
        return player.getPlaybackRate();
      } catch {
        return null;
      }
    },
    setPlaybackRate: (rate) => player.setPlaybackRate(rate),
    getPlayerState: () => stateMap[player.getPlayerState()] ?? null,
    destroy: () => {
      try {
        player.destroy();
      } catch {
        /* ignore */
      }
    },
  };
}
