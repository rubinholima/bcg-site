"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Users,
  RefreshCw,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Label } from "@/components/ui/label";
import { ModalNativeSelect } from "@/components/ui/modal-native-select";
import { api } from "@/lib/api";
import type { HallSyncState } from "@/components/boston-tv/BostonTvHallChannelPanel";
import {
  BOSTON_TV_HALL_SYNC_FOLLOW,
  BOSTON_TV_HALL_SYNC_INDEPENDENT,
  formatHallOffsetMs,
  hallScreenShortLabel,
  hallSyncModeLabel,
  normalizeHallSyncMode,
  parseHallScreenNum,
  type HallSyncMode,
} from "@/lib/boston-tv-hall";

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

interface ControlScreen {
  id: string;
  name: string;
  displayMode: string;
  hallSyncMode: string;
  playlist: { id: string; name: string } | null;
  iptvChannel: { id: string; name: string } | null;
}

interface PlaylistOption {
  id: string;
  name: string;
}

interface BostonTvHallControlViewProps {
  tenantId: string;
}

function screenContentSummary(s: ControlScreen): string {
  if (s.displayMode === "iptv" && s.iptvChannel) {
    return s.iptvChannel.name;
  }
  if (s.playlist) return s.playlist.name;
  return "Sem conteúdo";
}

export function BostonTvHallControlView({ tenantId }: BostonTvHallControlViewProps) {
  const [channel, setChannel] = useState<HallChannelResponse | null>(null);
  const [screens, setScreens] = useState<ControlScreen[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [picked, setPicked] = useState<ControlScreen | null>(null);
  const [pickMode, setPickMode] = useState<HallSyncMode>(BOSTON_TV_HALL_SYNC_FOLLOW);
  const [pickPlaylistId, setPickPlaylistId] = useState("");
  const [resetAllOpen, setResetAllOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) {
      setChannel(null);
      setScreens([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [channelRes, screensRes, plRes] = await Promise.all([
        api.get<HallChannelResponse>(
          `/boston-tv/hall-channel?tenantId=${encodeURIComponent(tenantId)}`,
        ),
        api.get<ControlScreen[]>(
          `/boston-tv/screens?tenantId=${encodeURIComponent(tenantId)}`,
        ),
        api.get<PlaylistOption[]>(
          `/boston-tv/playlists?tenantId=${encodeURIComponent(tenantId)}`,
        ),
      ]);
      setChannel(channelRes.data);
      setScreens(screensRes.data ?? []);
      setPlaylists(plRes.data ?? []);
    } catch {
      setChannel(null);
      setScreens([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(t);
  }, [load]);

  const sortedScreens = useMemo(() => {
    return [...screens].sort((a, b) => {
      const na = parseHallScreenNum(a.name) ?? 9999;
      const nb = parseHallScreenNum(b.name) ?? 9999;
      return na - nb || a.name.localeCompare(b.name, "pt-BR");
    });
  }, [screens]);

  const hallAction = async (path: string) => {
    if (!tenantId) return;
    setActing(true);
    try {
      const { data } = await api.post<HallChannelResponse>(
        `/boston-tv/hall-channel/${path}?tenantId=${encodeURIComponent(tenantId)}`,
      );
      setChannel(data);
    } finally {
      setActing(false);
    }
  };

  const resetAll = async () => {
    if (!tenantId) return;
    setActing(true);
    try {
      await api.post(
        `/boston-tv/hall-channel/reset-screens?tenantId=${encodeURIComponent(tenantId)}`,
      );
      await load();
    } finally {
      setActing(false);
    }
  };

  const openScreen = (s: ControlScreen) => {
    setPicked(s);
    setPickMode(normalizeHallSyncMode(s.hallSyncMode));
    setPickPlaylistId(s.playlist?.id ?? playlists[0]?.id ?? "");
  };

  const applyScreenMode = async () => {
    if (!picked) return;
    if (
      pickMode === BOSTON_TV_HALL_SYNC_INDEPENDENT &&
      picked.displayMode === "playlist" &&
      !pickPlaylistId
    ) {
      setFeedback({
        title: "Playlist obrigatória",
        message: "Escolha a playlist para o modo individual.",
      });
      return;
    }
    setActing(true);
    try {
      if (pickMode === BOSTON_TV_HALL_SYNC_FOLLOW) {
        await api.patch(`/boston-tv/screens/${picked.id}`, {
          hallSyncMode: BOSTON_TV_HALL_SYNC_FOLLOW,
          displayMode: "playlist",
        });
      } else {
        await api.patch(`/boston-tv/screens/${picked.id}`, {
          hallSyncMode: BOSTON_TV_HALL_SYNC_INDEPENDENT,
          displayMode: "playlist",
          playlistId: pickPlaylistId,
        });
      }
      setPicked(null);
      await load();
    } finally {
      setActing(false);
    }
  };

  const sync = channel?.configured ? channel.hallSync : null;
  const independentCount = screens.filter(
    (s) =>
      s.displayMode === "playlist" &&
      normalizeHallSyncMode(s.hallSyncMode) === BOSTON_TV_HALL_SYNC_INDEPENDENT,
  ).length;

  return (
    <div className="space-y-6 pb-8">
      {channel?.configured ? (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Canal Hall
              </p>
              <p className="text-lg font-semibold text-foreground truncate">
                {channel.playlistName}
              </p>
              {sync ? (
                <p className="text-sm text-muted-foreground">
                  {sync.paused ? (
                    <span className="text-amber-400 font-medium">Pausado</span>
                  ) : (
                    <span className="text-emerald-400 font-medium">No ar</span>
                  )}
                  {" · "}
                  Item #{sync.itemIndex + 1} · {formatHallOffsetMs(sync.offsetMs)} /{" "}
                  {formatHallOffsetMs(sync.itemDurationMs)}
                </p>
              ) : null}
              {independentCount > 0 ? (
                <p className="text-xs text-violet-300">
                  {independentCount}{" "}
                  {independentCount === 1 ? "tela individual" : "telas individuais"}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px] shrink-0"
              disabled={loading || acting}
              onClick={() => void load()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {sync?.paused ? (
              <Button
                type="button"
                disabled={acting}
                className="min-h-[56px] text-base"
                onClick={() => void hallAction("play")}
              >
                <Play className="mr-2 h-5 w-5" />
                Continuar
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={acting}
                className="min-h-[56px] text-base"
                onClick={() => void hallAction("pause")}
              >
                <Pause className="mr-2 h-5 w-5" />
                Pausar
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={acting}
              className="min-h-[56px] text-base"
              onClick={() => void hallAction("next")}
            >
              <SkipForward className="mr-2 h-5 w-5" />
              Próximo
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={acting}
              className="min-h-[56px] text-base"
              onClick={() => void hallAction("restart")}
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Reiniciar
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={acting}
              className="min-h-[56px] text-base col-span-2 sm:col-span-1"
              onClick={() => setResetAllOpen(true)}
            >
              <Users className="mr-2 h-5 w-5" />
              Tudo ao Hall
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100/90">
          {channel && !channel.configured
            ? channel.message
            : "Ative o Canal Hall na página BCG TV antes de usar o controle."}
        </div>
      )}

      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          Toque em uma tela para alternar entre <strong>Canal Hall</strong> e{" "}
          <strong>Individual</strong>.
        </p>

        {loading && screens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Carregando telas…</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {sortedScreens.map((s) => {
              const num = parseHallScreenNum(s.name);
              const isIndependent =
                s.displayMode === "playlist" &&
                normalizeHallSyncMode(s.hallSyncMode) === BOSTON_TV_HALL_SYNC_INDEPENDENT;
              const isIptv = s.displayMode === "iptv";
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`flex min-h-[88px] w-full flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition-colors touch-manipulation active:scale-[0.98] ${
                      isIndependent
                        ? "border-violet-500/50 bg-violet-500/15 hover:bg-violet-500/25"
                        : isIptv
                          ? "border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20"
                          : "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                    }`}
                    onClick={() => openScreen(s)}
                  >
                    <span className="text-2xl font-bold tabular-nums leading-none">
                      {num ?? "—"}
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs font-medium text-foreground">
                      {hallScreenShortLabel(s.name)}
                    </span>
                    <span
                      className={`mt-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isIptv
                          ? "bg-sky-500/25 text-sky-200"
                          : isIndependent
                            ? "bg-violet-500/25 text-violet-200"
                            : "bg-emerald-500/25 text-emerald-200"
                      }`}
                    >
                      {isIptv ? "IPTV" : hallSyncModeLabel(s.hallSyncMode)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AlertDialog open={resetAllOpen} onOpenChange={setResetAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voltar todas ao Canal Hall?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as telas em modo playlist voltam a seguir o Canal Hall com a playlist ativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={acting}
              onClick={(e) => {
                e.preventDefault();
                setResetAllOpen(false);
                void resetAll();
              }}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!picked} onOpenChange={(open) => !open && setPicked(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{picked?.name ?? "Tela"}</DialogTitle>
          </DialogHeader>
          {picked ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Agora: <strong className="text-foreground">{screenContentSummary(picked)}</strong>
              </p>

              {picked.displayMode === "iptv" ? (
                <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
                  Canal IPTV fixo. Toque abaixo para voltar ao Canal Hall (playlist
                  sincronizada).
                </p>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="ctrl-hall-sync">Modo</Label>
                <ModalNativeSelect
                  id="ctrl-hall-sync"
                  value={pickMode}
                  onChange={(v) => setPickMode(v as HallSyncMode)}
                  options={[
                    {
                      value: BOSTON_TV_HALL_SYNC_FOLLOW,
                      label: "Seguir Canal Hall (igual às outras)",
                    },
                    {
                      value: BOSTON_TV_HALL_SYNC_INDEPENDENT,
                      label: "Individual (playlist só nesta TV)",
                    },
                  ]}
                />
              </div>

              {pickMode === BOSTON_TV_HALL_SYNC_INDEPENDENT ? (
                <div className="space-y-2">
                  <Label htmlFor="ctrl-playlist">Playlist</Label>
                  {playlists.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Crie uma playlist na página BCG TV.
                    </p>
                  ) : (
                    <ModalNativeSelect
                      id="ctrl-playlist"
                      value={
                        pickPlaylistId && playlists.some((p) => p.id === pickPlaylistId)
                          ? pickPlaylistId
                          : playlists[0]?.id ?? ""
                      }
                      onChange={setPickPlaylistId}
                      options={playlists.map((p) => ({ value: p.id, label: p.name }))}
                    />
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="min-h-[44px]" onClick={() => setPicked(null)}>
              Cancelar
            </Button>
            <Button
              className="min-h-[44px]"
              disabled={acting}
              onClick={() => void applyScreenMode()}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback !== null}
        onOpenChange={(open) => !open && setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        variant="warning"
      />
    </div>
  );
}
