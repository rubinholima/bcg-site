"use client";

import { useEffect, useRef, useState } from "react";

type HlsInstance = { destroy: () => void };
type MpegTsPlayer = {
  destroy: () => void;
  attachMediaElement: (el: HTMLVideoElement) => void;
  load: () => void;
  play: () => Promise<void>;
  on: (event: string, cb: () => void) => void;
};

interface HlsStreamPlayerProps {
  url: string;
  className?: string;
  label?: string;
}

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

function toAbsoluteStreamUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (typeof window === "undefined") return u;
  return `${window.location.origin}${u.startsWith("/") ? u : `/${u}`}`;
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

export function HlsStreamPlayer({ url, className = "", label }: HlsStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(true);

  useEffect(() => {
    setError(null);
    setBuffering(true);
    const video = videoRef.current;
    if (!video || !url.trim()) return;

    let hlsInstance: HlsInstance | null = null;
    let mpegtsInstance: MpegTsPlayer | null = null;
    let cancelled = false;

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

    const tryMpegTs = async (streamUrl: string): Promise<boolean> => {
      if (cancelled) return false;
      resetVideo();
      video.muted = true;
      video.playsInline = true;

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
          {
            enableStashBuffer: false,
            stashInitialSize: 128,
            liveBufferLatencyChasing: true,
          },
        ) as MpegTsPlayer;

        mpegtsInstance = player;
        player.on(mpegts.Events.ERROR, () => finish(false));
        player.attachMediaElement(video);
        player.load();
        void player
          .play()
          .then(() => waitForVideoPicture(video, 15000))
          .then((hasPicture) => finish(hasPicture))
          .catch(() => finish(false));
      });
    };

    const tryHlsJs = async (streamUrl: string): Promise<boolean> => {
      if (cancelled) return false;
      resetVideo();
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      const HlsMod = (await import("hls.js")).default;
      if (HlsMod.isSupported()) {
        const instance = new HlsMod({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 30,
        });
        hlsInstance = instance;
        return new Promise<boolean>((resolve) => {
          instance.loadSource(streamUrl);
          instance.attachMedia(video);
          instance.on(HlsMod.Events.MANIFEST_PARSED, () => {
            void video.play().then(() => resolve(true)).catch(() => resolve(false));
          });
          instance.on(HlsMod.Events.ERROR, (_e, data) => {
            if (data.fatal) resolve(false);
          });
          window.setTimeout(() => resolve(false), 8000);
        });
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        try {
          await video.play();
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
      destroyHls();
      destroyMpegTs();
    };
  }, [url, label]);

  if (error) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center bg-black text-zinc-400 ${className}`}>
        <p className="text-sm px-6 text-center max-w-xl leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full bg-black ${className}`}>
      {buffering ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-zinc-500 text-sm">
          Conectando ao canal…
        </div>
      ) : null}
      <video ref={videoRef} className="h-full w-full object-contain" muted playsInline autoPlay />
      {label ? (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
          <p className="text-sm text-white/90 truncate">{label}</p>
        </div>
      ) : null}
    </div>
  );
}
