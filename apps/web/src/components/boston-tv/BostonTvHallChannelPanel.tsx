"use client";

import { useCallback, useEffect, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { BostonTvCollapsibleSection } from "@/components/boston-tv/BostonTvCollapsibleSection";

export type HallSyncState = {
  serverNow: string;
  paused: boolean;
  playlistVersion: number;
  itemIndex: number;
  offsetMs: number;
  itemDurationMs: number;
  loopDurationMs: number;
};

type HallChannelResponse =
  | {
      configured: false;
      tenantId: string;
      message: string;
    }
  | {
      configured: true;
      tenantId: string;
      playlistId: string;
      playlistName: string;
      itemCount: number;
      hallSync: HallSyncState;
    };

interface BostonTvHallChannelPanelProps {
  tenantId: string;
}

function formatOffset(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function BostonTvHallChannelPanel({ tenantId }: BostonTvHallChannelPanelProps) {
  const [open, setOpen] = useState(true);
  const [data, setData] = useState<HallChannelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: res } = await api.get<HallChannelResponse>(
        `/boston-tv/hall-channel?tenantId=${encodeURIComponent(tenantId)}`,
      );
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(t);
  }, [load]);

  const action = async (path: string) => {
    if (!tenantId) return;
    setActing(true);
    try {
      const { data: res } = await api.post<HallChannelResponse>(
        `/boston-tv/hall-channel/${path}?tenantId=${encodeURIComponent(tenantId)}`,
      );
      setData(res);
    } finally {
      setActing(false);
    }
  };

  const sync = data?.configured ? data.hallSync : null;

  return (
    <BostonTvCollapsibleSection
      title="Canal Hall — sincronizado"
      open={open}
      onOpenChange={setOpen}
    >
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Todas as telas com a playlist do Canal Hall tocam o mesmo conteúdo no mesmo instante.
          Recarregar uma TV não reinicia do zero.
        </p>

        {loading && !data ? (
          <p className="text-muted-foreground">Carregando canal…</p>
        ) : null}

        {data && !data.configured ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200/90">
            {data.message}
          </p>
        ) : null}

        {data?.configured ? (
          <>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1">
              <p>
                <span className="text-muted-foreground">Playlist:</span>{" "}
                <strong className="text-foreground">{data.playlistName}</strong>
                {" · "}
                {data.itemCount} {data.itemCount === 1 ? "item" : "itens"}
              </p>
              {sync ? (
                <>
                  <p>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    {sync.paused ? (
                      <span className="text-amber-400">Pausado</span>
                    ) : (
                      <span className="text-emerald-400">No ar</span>
                    )}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Item atual:</span>{" "}
                    #{sync.itemIndex + 1} · {formatOffset(sync.offsetMs)} /{" "}
                    {formatOffset(sync.itemDurationMs)}
                  </p>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {sync?.paused ? (
                <Button
                  type="button"
                  disabled={acting}
                  onClick={() => void action("play")}
                  className="min-h-[44px]"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Continuar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={acting}
                  onClick={() => void action("pause")}
                  className="min-h-[44px]"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pausar
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={acting}
                onClick={() => void action("next")}
                className="min-h-[44px]"
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Próximo
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={acting}
                onClick={() => void action("restart")}
                className="min-h-[44px]"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reiniciar do início
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </BostonTvCollapsibleSection>
  );
}
