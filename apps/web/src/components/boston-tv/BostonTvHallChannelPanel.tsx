"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, Link2, Pause, Play, RotateCcw, SkipForward, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ModalNativeSelect } from "@/components/ui/modal-native-select";
import { api } from "@/lib/api";
import { BC_HALL_LABEL } from "@/lib/boston-tv-hall";
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

type PlaylistOption = { id: string; name: string };

type ConfirmAction =
  | { type: "swap"; playlistName: string }
  | { type: "reset" };

interface BostonTvHallChannelPanelProps {
  tenantId: string;
  onScreensReset?: () => void | Promise<void>;
  /** Dentro de abas do dashboard — sem card recolhível. */
  embedded?: boolean;
}

function formatOffset(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function BostonTvHallChannelPanel({
  tenantId,
  onScreensReset,
  embedded = false,
}: BostonTvHallChannelPanelProps) {
  const [open, setOpen] = useState(true);
  const [data, setData] = useState<HallChannelResponse | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [pickPlaylistId, setPickPlaylistId] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) {
      setData(null);
      setPlaylists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [channelRes, plRes] = await Promise.all([
        api.get<HallChannelResponse>(
          `/boston-tv/hall-channel?tenantId=${encodeURIComponent(tenantId)}`,
        ),
        api.get<PlaylistOption[]>(
          `/boston-tv/playlists?tenantId=${encodeURIComponent(tenantId)}`,
        ),
      ]);
      setData(channelRes.data);
      const pls = plRes.data ?? [];
      setPlaylists(pls);
      if (channelRes.data?.configured) {
        setPickPlaylistId(channelRes.data.playlistId);
      } else {
        setPickPlaylistId((prev) => prev || pls[0]?.id || "");
      }
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

  const bindPlaylist = async () => {
    if (!tenantId || !pickPlaylistId) return;
    setActing(true);
    try {
      const { data: res } = await api.post<HallChannelResponse>(
        `/boston-tv/hall-channel/bind`,
        { tenantId, playlistId: pickPlaylistId },
      );
      setData(res);
      if (res?.configured) {
        setPickPlaylistId(res.playlistId);
      }
    } finally {
      setActing(false);
    }
  };

  const resetScreensToHall = async () => {
    if (!tenantId) return;
    setActing(true);
    try {
      await api.post(
        `/boston-tv/hall-channel/reset-screens?tenantId=${encodeURIComponent(tenantId)}`,
      );
      await onScreensReset?.();
    } finally {
      setActing(false);
    }
  };

  const requestSwapPlaylist = () => {
    if (!pickPlaylistId || !data?.configured || pickPlaylistId === data.playlistId) return;
    const name =
      playlists.find((p) => p.id === pickPlaylistId)?.name ?? "esta playlist";
    setConfirmAction({ type: "swap", playlistName: name });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null);
    if (action.type === "swap") {
      await bindPlaylist();
    } else {
      await resetScreensToHall();
    }
  };

  const sync = data?.configured ? data.hallSync : null;

  const panelBody = (
    <div className="space-y-4 text-sm">
        {loading && !data ? (
          <p className="text-muted-foreground">Carregando canal…</p>
        ) : null}

        {data && !data.configured ? (
          <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-amber-100/90">{data.message}</p>
            {playlists.length === 0 ? (
              <p className="text-muted-foreground">
                Crie uma playlist na aba <strong className="text-foreground">Playlists</strong>.
              </p>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-[200px] flex-1 space-y-2">
                  <Label htmlFor="hall-channel-playlist">Playlist do {BC_HALL_LABEL}</Label>
                  <ModalNativeSelect
                    id="hall-channel-playlist"
                    value={pickPlaylistId}
                    onChange={setPickPlaylistId}
                    placeholder="Escolher playlist…"
                    options={playlists.map((p) => ({ value: p.id, label: p.name }))}
                  />
                </div>
                <Button
                  type="button"
                  disabled={acting || !pickPlaylistId}
                  onClick={() => void bindPlaylist()}
                  className="min-h-[44px] shrink-0"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Ativar {BC_HALL_LABEL}
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {data?.configured ? (
          <>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1">
              <p>
                <span className="text-muted-foreground">Playlist ativa:</span>{" "}
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

            {playlists.length === 0 ? (
              <p className="text-muted-foreground">
                Crie outra playlist na aba Playlists para trocar o {BC_HALL_LABEL}.
              </p>
            ) : (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-end">
                <div className="min-w-[200px] flex-1 space-y-2">
                  <Label htmlFor="hall-channel-swap-playlist">Trocar playlist</Label>
                  <ModalNativeSelect
                    id="hall-channel-swap-playlist"
                    value={pickPlaylistId}
                    onChange={setPickPlaylistId}
                    placeholder="Escolher playlist…"
                    options={playlists.map((p) => ({ value: p.id, label: p.name }))}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    acting ||
                    !pickPlaylistId ||
                    pickPlaylistId === data.playlistId
                  }
                  onClick={requestSwapPlaylist}
                  className="min-h-[44px] shrink-0"
                >
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Trocar playlist
                </Button>
              </div>
            )}

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
                Reiniciar
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={acting}
                onClick={() => setConfirmAction({ type: "reset" })}
                className="min-h-[44px]"
              >
                <Users className="mr-2 h-4 w-4" />
                Voltar todas ao {BC_HALL_LABEL}
              </Button>
            </div>
          </>
        ) : null}
    </div>
  );

  const dialogs = (
    <>
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "swap"
                ? `Trocar playlist do ${BC_HALL_LABEL}?`
                : `Voltar todas ao ${BC_HALL_LABEL}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "swap" ? (
                <>
                  O {BC_HALL_LABEL} passará a usar{" "}
                  <strong className="text-foreground">{confirmAction.playlistName}</strong>.
                  Todas as telas sincronizadas recomeçam do início.
                </>
              ) : (
                <>
                  Todas as telas em modo playlist voltam a seguir o {BC_HALL_LABEL} com a playlist
                  ativa. Telas individuais também serão resetadas.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={acting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmAction();
              }}
            >
              {confirmAction?.type === "swap" ? "Trocar playlist" : "Continuar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (embedded) {
    return (
      <>
        {panelBody}
        {dialogs}
      </>
    );
  }

  return (
    <>
      <BostonTvCollapsibleSection
        title={`${BC_HALL_LABEL} — sincronizado`}
        open={open}
        onOpenChange={setOpen}
      >
        {panelBody}
      </BostonTvCollapsibleSection>
      {dialogs}
    </>
  );
}
