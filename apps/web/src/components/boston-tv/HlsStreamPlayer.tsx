"use client";

import { useEffect, useRef, useState } from "react";

type HlsInstance = { destroy: () => void };

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

function preferNativeVideo(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes(".ts") ||
    u.includes("/stream?") ||
    (!u.includes(".m3u8") && /^https?:\/\//.test(u))
  );
}

export function HlsStreamPlayer({ url, className = "", label }: HlsStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const video = videoRef.current;
    if (!video || !url.trim()) return;

    let hlsInstance: HlsInstance | null = null;
    let cancelled = false;

    const destroyHls = () => {
      hlsInstance?.destroy();
      hlsInstance = null;
    };

    const tryNativeVideo = async (streamUrl: string): Promise<boolean> => {
      if (cancelled) return false;
      destroyHls();
      video.removeAttribute("src");
      video.load();
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.src = streamUrl;
      try {
        await video.play();
        return !video.error;
      } catch {
        return false;
      }
    };

    const tryHlsJs = async (streamUrl: string): Promise<boolean> => {
      if (cancelled) return false;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      const HlsMod = (await import("hls.js")).default;
      if (HlsMod.isSupported()) {
        destroyHls();
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
      for (const candidate of candidateUrls(url)) {
        if (cancelled) break;

        if (preferNativeVideo(candidate)) {
          const okNative = await tryNativeVideo(candidate);
          if (okNative) {
            setError(null);
            return;
          }
        }

        const okHls = await tryHlsJs(candidate);
        if (okHls) {
          setError(null);
          return;
        }

        if (!preferNativeVideo(candidate)) {
          const okNative = await tryNativeVideo(candidate);
          if (okNative) {
            setError(null);
            return;
          }
        }

        destroyHls();
        video.removeAttribute("src");
        video.load();
      }

      if (!cancelled) {
        setError(
          label
            ? `${label} — este canal da lista não abre no navegador. Escolha outro canal (ex.: Globo/ESPN com stream .ts) no dashboard.`
            : "Este canal da lista não abre no navegador. Escolha outro canal no dashboard Boston TV.",
        );
      }
    })();

    return () => {
      cancelled = true;
      destroyHls();
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
      <video ref={videoRef} className="h-full w-full object-contain" muted playsInline />
      {label ? (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
          <p className="text-sm text-white/90 truncate">{label}</p>
        </div>
      ) : null}
    </div>
  );
}
