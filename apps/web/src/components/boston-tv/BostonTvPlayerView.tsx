"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isWithinContentWindow } from "@/lib/boston-tv-schedule";
import { HlsStreamPlayer } from "@/components/boston-tv/HlsStreamPlayer";

export type BostonTvPlayerItem = {
  id: string;
  contentType: string;
  url: string;
  durationSeconds: number | null;
  sortOrder: number;
  channelName?: string;
};

export type BostonTvPlayerPayload = {
  screenName: string;
  tenantName: string;
  scheduleTimezone: string;
  weeklySchedule: unknown;
  playlistName: string | null;
  displayMode?: string;
  items: BostonTvPlayerItem[];
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

export function BostonTvPlayerView({ token }: { token: string }) {
  const [payload, setPayload] = useState<BostonTvPlayerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [tick, setTick] = useState(0);

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

  useEffect(() => {
    void load();
    const i = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(i);
  }, [load]);

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
  const current = items[idx % Math.max(items.length, 1)];

  useEffect(() => {
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
  }, [current, items.length, idx]);

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

  if (current.contentType === "image_url") {
    return (
      <div className="relative h-screen w-screen bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt=""
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  if (current.contentType === "video_url") {
    return (
      <div className="relative h-screen w-screen bg-black">
        <video
          key={current.id}
          src={current.url}
          className="h-full w-full object-contain"
          autoPlay
          muted
          playsInline
          onEnded={() => setIdx((i) => (i + 1) % items.length)}
        />
      </div>
    );
  }

  if (current.contentType === "iptv_stream") {
    return (
      <HlsStreamPlayer
        url={current.url}
        className="h-screen w-screen"
        label={current.channelName}
      />
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
        <iframe
          key={current.id}
          title="Boston TV"
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${yid}?autoplay=1&mute=1&playsinline=1&rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
      Tipo desconhecido: {current.contentType}
    </div>
  );
}
