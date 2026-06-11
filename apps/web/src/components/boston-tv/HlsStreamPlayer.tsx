"use client";

import { useEffect, useRef, useState } from "react";

type HlsInstance = { destroy: () => void };
type MpegTsPlayer = {
  destroy: () => void;
  attachMediaElement: (el: HTMLVideoElement) => void;
  load: () => void;
  play: () => Promise<void>;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  off: (event: string, cb: (...args: unknown[]) => void) => void;
};

interface HlsStreamPlayerProps {
  url: string;
  className?: string;
  label?: string;
  /** TV signage: tenta reproduzir com áudio (HDMI). Fallback mudo se o browser bloquear autoplay. */
  withAudio?: boolean;
  /** Canal Hall pausado — congela stream ao vivo. */
  paused?: boolean;
}

const MPEGTS_CONFIG = {
  enableStashBuffer: true,
  stashInitialSize: 1024,
  liveBufferLatencyChasing: false,
  lazyLoad: false,
  deferLoadAfterSourceOpen: false,
  autoCleanupSourceBuffer: true,
};

function candidateUrls(url: string): string[] {
  const u = url.trim();
  const out = [u];
  const lower = u.toLowerCase();
  if (!lower.includes(".m3u8") && !lower.includes("/stream?")) {
    out.push(`${u}.m3u8`, `${u}/index.m3u8`);
  }
  return [...new Set(out)];
}

function preferMpegTs(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes(".ts") || u.includes("/stream?") || !u.includes(".m3u8");
}

/** Stream IPTV: bypass CloudFront (corta ~60s) → origin direto ao Lightsail. */
function toAbsoluteStreamUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (typeof window === "undefined") return u;
  const path = u.startsWith("/") ? u : `/${u}`;
  const isBostonTvProxy =
    path.includes("/boston-tv/play/") && path.includes("/stream");
  if (isBostonTvProxy) {
    const configured = process.env.NEXT_PUBLIC_BOSTON_TV_STREAM_ORIGIN?.replace(
      /\/$/,
      "",
    );
    const host = window.location.hostname;
    const origin =
      configured ||
      (host === "www.bostoncitygroup.biz" || host === "bostoncitygroup.biz"
        ? "https://origin.bostoncitygroup.biz"
        : null);
    if (origin) return `${origin}${path}`;
  }
  return `${window.location.origin}${path}`;
}

function applyAudio(video: HTMLVideoElement, withAudio: boolean) {
  if (withAudio) {
    video.muted = false;
    video.volume = 1;
  } else {
    video.muted = true;
  }
}

async function playWithOptionalAudio(
  video: HTMLVideoElement,
  withAudio: boolean,
): Promise<boolean> {
  applyAudio(video, withAudio);
  try {
    await video.play();
    return !withAudio || !video.muted;
  } catch {
    if (withAudio) {
      video.muted = true;
      await video.play();
      return false;
    }
    throw new Error("play failed");
  }
}

function waitForVideoPicture(video: HTMLVideoElement, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      resolve(true);
      return;
    }
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve(video.videoWidth > 0 && video.videoHeight > 0);
    }, ms);
    const onReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup();
        resolve(true);
      }
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("playing", onReady);
      video.removeEventListener("resize", onReady);
    };
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("playing", onReady);
    video.addEventListener("resize", onReady);
  });
}

export function HlsStreamPlayer({ url, className = "", label, withAudio = true, paused = false }: HlsStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [reconnectToken, setReconnectToken] = useState(0);
  const lastProgressRef = useRef(Date.now());

  const enableAudio = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    try {
      await video.play();
      setAudioBlocked(false);
    } catch {
      /* mantém overlay se ainda bloquear */
    }
  };

  useEffect(() => {
    setError(null);
    setBuffering(true);
    setAudioBlocked(false);
    const video = videoRef.current;
    if (!video || !url.trim()) return;

    let hlsInstance: HlsInstance | null = null;
    let mpegtsInstance: MpegTsPlayer | null = null;
    let cancelled = false;

    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onPlaying);

    const destroyHls = () => {
      hlsInstance?.destroy();
      hlsInstance = null;
    };

    const destroyMpegTs = () => {
      try {
        mpegtsInstance?.destroy();
      } catch {
        /* ignore */
      }
      mpegtsInstance = null;
    };

    const resetVideo = () => {
      destroyHls();
      destroyMpegTs();
      video.removeAttribute("src");
      video.load();
    };

    const tryMpegTs = async (streamUrl: string, attempt = 0): Promise<boolean> => {
      if (cancelled) return false;
      resetVideo();
      video.playsInline = true;
      applyAudio(video, withAudio);

      const absoluteUrl = toAbsoluteStreamUrl(streamUrl);
      const mod = await import("mpegts.js");
      const mpegts = mod.default;
      if (!mpegts.isSupported()) return false;

      return new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled || cancelled) return;
          settled = true;
          resolve(ok);
        };

        const player = mpegts.createPlayer(
          {
            type: "mpegts",
            isLive: true,
            url: absoluteUrl,
          },
          MPEGTS_CONFIG,
        ) as MpegTsPlayer;

        mpegtsInstance = player;

        const onError = () => {
          if (attempt < 2 && !cancelled) {
            player.off(mpegts.Events.ERROR, onError);
            destroyMpegTs();
            window.setTimeout(() => {
              void tryMpegTs(streamUrl, attempt + 1).then(finish);
            }, 2000);
            return;
          }
          finish(false);
        };

        player.on(mpegts.Events.ERROR, onError);
        player.attachMediaElement(video);
        player.load();
        void player
          .play()
          .catch(async () => {
            if (withAudio) {
              video.muted = true;
              await player.play();
              if (!cancelled) setAudioBlocked(true);
            }
          })
          .then(() => waitForVideoPicture(video, 20000))
          .then((hasPicture) => {
            if (hasPicture) {
              player.off(mpegts.Events.ERROR, onError);
              if (withAudio && video.muted && !cancelled) setAudioBlocked(true);
            }
            finish(hasPicture);
          })
          .catch(() => finish(false));
      });
    };

    const tryHlsJs = async (streamUrl: string): Promise<boolean> => {
      if (cancelled) return false;
      resetVideo();
      video.playsInline = true;
      video.autoplay = true;
      applyAudio(video, withAudio);

      const HlsMod = (await import("hls.js")).default;
      if (HlsMod.isSupported()) {
        const instance = new HlsMod({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          backBufferLength: 30,
        });
        hlsInstance = instance;
        return new Promise<boolean>((resolve) => {
          instance.loadSource(streamUrl);
          instance.attachMedia(video);
          instance.on(HlsMod.Events.MANIFEST_PARSED, () => {
            void playWithOptionalAudio(video, withAudio)
              .then((audioOk) => {
                if (withAudio && !audioOk) setAudioBlocked(true);
                resolve(true);
              })
              .catch(() => resolve(false));
          });
          instance.on(HlsMod.Events.ERROR, (_e, data) => {
            if (data.fatal) resolve(false);
          });
          window.setTimeout(() => resolve(false), 12000);
        });
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        try {
          const audioOk = await playWithOptionalAudio(video, withAudio);
          if (withAudio && !audioOk) setAudioBlocked(true);
          return true;
        } catch {
          return false;
        }
      }

      return false;
    };

    void (async () => {
      const baseUrl = toAbsoluteStreamUrl(url);
      for (const candidate of candidateUrls(baseUrl)) {
        if (cancelled) break;

        if (preferMpegTs(candidate)) {
          const okMpeg = await tryMpegTs(candidate);
          if (okMpeg) {
            setError(null);
            setBuffering(false);
            return;
          }
        }

        const okHls = await tryHlsJs(candidate);
        if (okHls) {
          setError(null);
          setBuffering(false);
          return;
        }
      }

      if (!cancelled) {
        setBuffering(false);
        setError(
          label
            ? `${label} — não foi possível abrir este canal. Tente outro canal liberado ou confira se o stream está online.`
            : "Não foi possível abrir este canal IPTV. Escolha outro canal liberado no dashboard Boston TV.",
        );
      }
    })();

    return () => {
      cancelled = true;
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onPlaying);
      destroyHls();
      destroyMpegTs();
    };
  }, [url, label, withAudio, reconnectToken]);

  useEffect(() => {
    lastProgressRef.current = Date.now();
  }, [url, reconnectToken]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || paused || error) return;

    const markProgress = () => {
      lastProgressRef.current = Date.now();
    };

    video.addEventListener("timeupdate", markProgress);
    video.addEventListener("playing", markProgress);

    const watchdog = window.setInterval(() => {
      if (paused || error) return;
      if (Date.now() - lastProgressRef.current > 18_000) {
        lastProgressRef.current = Date.now();
        setReconnectToken((t) => t + 1);
      }
    }, 6000);

    return () => {
      video.removeEventListener("timeupdate", markProgress);
      video.removeEventListener("playing", markProgress);
      window.clearInterval(watchdog);
    };
  }, [paused, error, url, reconnectToken]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else void video.play().catch(() => {});
  }, [paused]);

  if (error) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center bg-black text-zinc-400 ${className}`}>
        <p className="text-sm px-6 text-center max-w-xl leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative h-full w-full bg-black ${className}`}
      onClick={() => {
        if (audioBlocked) void enableAudio();
      }}
      onKeyDown={(e) => {
        if (audioBlocked && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          void enableAudio();
        }
      }}
      role={audioBlocked ? "button" : undefined}
      tabIndex={audioBlocked ? 0 : undefined}
    >
      {buffering ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-zinc-500 text-sm">
          Conectando ao canal…
        </div>
      ) : null}
      {audioBlocked && withAudio ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 px-6 text-center">
          <p className="text-lg font-medium text-white">Som desligado pelo navegador</p>
          <p className="mt-2 max-w-md text-sm text-zinc-300">
            Toque na tela ou pressione OK no controle para ativar o áudio deste canal.
          </p>
          <button
            type="button"
            className="mt-6 min-h-[44px] rounded-lg bg-white px-8 py-3 text-base font-semibold text-black"
            onClick={(e) => {
              e.stopPropagation();
              void enableAudio();
            }}
          >
            Ativar som
          </button>
        </div>
      ) : null}
      <video ref={videoRef} className="h-full w-full object-contain" playsInline autoPlay />
      {label ? (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
          <p className="text-sm text-white/90 truncate">{label}</p>
        </div>
      ) : null}
    </div>
  );
}
