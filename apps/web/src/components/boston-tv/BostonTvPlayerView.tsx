"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isWithinContentWindow } from "@/lib/boston-tv-schedule";
import { HlsStreamPlayer } from "@/components/boston-tv/HlsStreamPlayer";
import { YoutubeTvPlayer } from "@/components/boston-tv/YoutubeTvPlayer";
import { getPublicImageUrl } from "@/lib/media-url";
import {
  extrapolateHallPosition,
  type HallSyncSnapshot,
} from "@/lib/boston-tv-hall-sync";

export type BostonTvPlayerItem = {
  id: string;
  contentType: string;
  url: string;
  durationSeconds: number | null;
  sortOrder: number;
  channelName?: string;
};

export type BostonTvHallSync = {
  serverNow: string;
  paused: boolean;
  playlistVersion: number;
  itemIndex: number;
  offsetMs: number;
  itemDurationMs: number;
  loopDurationMs: number;
};

export type BostonTvPlayerPayload = {
  screenName: string;
  tenantName: string;
  scheduleTimezone: string;
  weeklySchedule: unknown;
  playlistName: string | null;
  displayMode?: string;
  items: BostonTvPlayerItem[];
  hallSync?: BostonTvHallSync;
};

function extractYoutubeId(url: string): string | null {
  const u = url.trim();
  const v = /[?&]v=([^&]+)/.exec(u);
  if (v?.[1]) return v[1];
  const be = /youtu\.be\/([^?]+)/.exec(u);
  if (be?.[1]) return be[1];
  const emb = /youtube\.com\/embed\/([^?]+)/.exec(u);
  if (emb?.[1]) return emb[1];
  return null;
}

function SyncedVideo({
  src,
  itemKey,
  startSeconds,
  paused,
  onEndedLocal,
  synced,
}: {
  src: string;
  itemKey: string;
  startSeconds: number;
  paused: boolean;
  onEndedLocal: () => void;
  synced: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      if (startSeconds > 0.5 && Number.isFinite(el.duration)) {
        const target = Math.min(startSeconds, Math.max(0, el.duration - 0.5));
        if (Math.abs(el.currentTime - target) > 0.75) {
          el.currentTime = target;
        }
      }
    };
    el.addEventListener("loadedmetadata", apply);
    if (el.readyState >= 1) apply();
    return () => el.removeEventListener("loadedmetadata", apply);
  }, [itemKey, startSeconds]);

  useEffect(() => {
    if (!synced) return;
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      if (!Number.isFinite(el.duration)) return;
      const target = Math.min(startSeconds, Math.max(0, el.duration - 0.5));
      if (Math.abs(el.currentTime - target) > 0.75) {
        el.currentTime = target;
      }
    };
    const id = window.setInterval(apply, 2000);
    return () => window.clearInterval(id);
  }, [synced, startSeconds, itemKey]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (paused) {
      el.pause();
    } else {
      void el.play().catch(() => {});
    }
  }, [paused, itemKey]);

  return (
    <video
      ref={ref}
      key={itemKey}
      src={src}
      className="h-full w-full object-contain"
      autoPlay
      muted
      playsInline
      onEnded={synced ? undefined : onEndedLocal}
    />
  );
}

export function BostonTvPlayerView({ token }: { token: string }) {
  const [payload, setPayload] = useState<BostonTvPlayerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const [hallNowMs, setHallNowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/boston-tv/play/${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Erro ao carregar Boston TV");
      }
      const data = (await res.json()) as BostonTvPlayerPayload;
      setPayload(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  }, [token]);

  const synced = Boolean(payload?.hallSync && (payload?.items.length ?? 0) > 0);

  useEffect(() => {
    void load();
    const ms = synced ? 5_000 : 60_000;
    const i = window.setInterval(() => void load(), ms);
    return () => window.clearInterval(i);
  }, [load, synced]);

  useEffect(() => {
    if (!synced) return;
    const t = window.setInterval(() => setHallNowMs(Date.now()), 400);
    return () => window.clearInterval(t);
  }, [synced]);

  useEffect(() => {
    const ping = () => {
      void fetch(`/api/public/boston-tv/play/${encodeURIComponent(token)}/ping`, {
        method: "POST",
        cache: "no-store",
      }).catch(() => {});
    };
    ping();
    const p = window.setInterval(ping, 120_000);
    return () => window.clearInterval(p);
  }, [token]);

  const inWindow = useMemo(() => {
    if (!payload) return true;
    return isWithinContentWindow(
      new Date(),
      payload.weeklySchedule,
      payload.scheduleTimezone || "America/Sao_Paulo",
    );
  }, [payload, tick]);

  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 15_000);
    return () => window.clearInterval(t);
  }, []);

  const items = payload?.items ?? [];
  const hallSync = payload?.hallSync;

  const hallPosition = useMemo(() => {
    if (!synced || !hallSync || items.length === 0) return null;
    return extrapolateHallPosition(
      hallSync as HallSyncSnapshot,
      items,
      hallNowMs,
    );
  }, [synced, hallSync, items, hallNowMs]);

  const displayIdx =
    hallPosition?.itemIndex ??
    (synced && hallSync
      ? hallSync.itemIndex % Math.max(items.length, 1)
      : idx % Math.max(items.length, 1));
  const current = items[displayIdx];
  const syncOffsetMs = hallPosition?.offsetMs ?? (synced && hallSync ? hallSync.offsetMs : 0);
  const hallPaused = synced && hallSync ? hallSync.paused : false;

  useEffect(() => {
    if (synced) return;
    if (!current || items.length === 0) return;
    if (current.contentType === "image_url") {
      const sec = Math.max(5, current.durationSeconds ?? 10);
      const t = window.setTimeout(() => {
        setIdx((i) => (i + 1) % items.length);
      }, sec * 1000);
      return () => window.clearTimeout(t);
    }
    if (current.contentType === "youtube_video") {
      const sec =
        current.durationSeconds !== null && current.durationSeconds !== undefined
          ? Math.max(30, current.durationSeconds)
          : 480;
      const t = window.setTimeout(() => {
        setIdx((i) => (i + 1) % items.length);
      }, sec * 1000);
      return () => window.clearTimeout(t);
    }
    if (current.contentType === "iptv_stream") {
      if (items.length > 1 && current.durationSeconds) {
        const sec = Math.max(60, current.durationSeconds);
        const t = window.setTimeout(() => {
          setIdx((i) => (i + 1) % items.length);
        }, sec * 1000);
        return () => window.clearTimeout(t);
      }
      return undefined;
    }
    return undefined;
  }, [current, items.length, idx, synced]);

  const pauseOverlay = hallPaused ? (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center pb-8">
      <span className="rounded-full bg-black/70 px-4 py-2 text-sm text-zinc-300">Pausado</span>
    </div>
  ) : null;

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        <p className="text-center px-4">{error}</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-zinc-300">
        <p>Carregando Boston TV…</p>
      </div>
    );
  }

  if (!inWindow) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-black text-zinc-500">
        <p className="text-2xl font-medium text-zinc-400">Boston TV</p>
        <p className="mt-4 text-sm">Fora do horário programado (blecaute)</p>
        <p className="mt-2 text-xs text-zinc-600">{payload.screenName}</p>
      </div>
    );
  }

  if (items.length === 0 || !current) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-black text-zinc-400">
        <p className="text-xl">Boston TV</p>
        <p className="mt-4 max-w-md text-center text-sm">
          Nenhum item na playlist. Configure conteúdo no dashboard (Marketing → Boston TV).
        </p>
        <p className="mt-2 text-xs text-zinc-600">{payload.screenName}</p>
      </div>
    );
  }

  const mediaKey = synced && hallSync
    ? `${current.id}-v${hallSync.playlistVersion}-i${displayIdx}`
    : current.id;

  if (current.contentType === "image_url") {
    const src = getPublicImageUrl(current.url) || current.url;
    return (
      <div className="relative h-screen w-screen bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={mediaKey}
          src={src}
          alt=""
          className="h-full w-full object-contain"
        />
        {pauseOverlay}
      </div>
    );
  }

  if (current.contentType === "video_url") {
    const src = getPublicImageUrl(current.url) || current.url;
    return (
      <div className="relative h-screen w-screen bg-black">
        <SyncedVideo
          src={src}
          itemKey={mediaKey}
          startSeconds={syncOffsetMs / 1000}
          paused={hallPaused}
          synced={synced}
          onEndedLocal={() => setIdx((i) => (i + 1) % items.length)}
        />
        {pauseOverlay}
      </div>
    );
  }

  if (current.contentType === "iptv_stream") {
    return (
      <div className="relative h-screen w-screen bg-black">
        <HlsStreamPlayer
          key={mediaKey}
          url={current.url}
          className="h-screen w-screen"
          label={current.channelName}
          withAudio
          paused={hallPaused}
        />
        {pauseOverlay}
      </div>
    );
  }

  if (current.contentType === "youtube_video") {
    const yid = extractYoutubeId(current.url);
    if (!yid) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-black text-red-400">
          URL do YouTube inválida
        </div>
      );
    }
    return (
      <div className="relative h-screen w-screen bg-black">
        <YoutubeTvPlayer
          videoId={yid}
          itemKey={mediaKey}
          startSeconds={Math.floor(syncOffsetMs / 1000)}
          syncTargetSeconds={synced ? Math.floor(syncOffsetMs / 1000) : undefined}
          paused={hallPaused}
        />
        {pauseOverlay}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
      Tipo desconhecido: {current.contentType}
    </div>
  );
}
