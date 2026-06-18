"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Users,
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
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import type { HallSyncState } from "@/components/boston-tv/BostonTvHallChannelPanel";
import {
  BOSTON_TV_HALL_SYNC_FOLLOW,
  BOSTON_TV_HALL_SYNC_INDEPENDENT,
  BC_HALL_LABEL,
  formatHallOffsetMs,
  hallScreenShortLabel,
  hallSyncModeLabel,
  normalizeHallSyncMode,
  parseHallScreenNum,
  type HallSyncMode,
} from "@/lib/boston-tv-hall";
import { cn } from "@/lib/utils";

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

type IpadTab = "telas" | "bc-hall";

interface BostonTvHallControlViewProps {
  tenantId: string;
}

function IpadTouchButton({
  children,
  className,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border text-base font-semibold transition-transform touch-manipulation active:scale-[0.97] disabled:opacity-50",
        active
          ? "border-violet-400/60 bg-violet-500/25 text-white"
          : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function BostonTvHallControlView({ tenantId }: BostonTvHallControlViewProps) {
  const [channel, setChannel] = useState<HallChannelResponse | null>(null);
  const [screens, setScreens] = useState<ControlScreen[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [ipadTab, setIpadTab] = useState<IpadTab>("telas");
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
  const hallReady = channel?.configured === true;

  const pickedNum = picked ? parseHallScreenNum(picked.name) : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950">
      {/* Barra de status — alinhada ao conteúdo em tablets */}
      <div
        className="shrink-0 border-b border-zinc-800/60"
        style={{
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between py-2.5 sm:py-3">
          {picked ? (
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-zinc-300 touch-manipulation sm:text-base"
              onClick={() => setPicked(null)}
            >
              <ChevronLeft className="h-5 w-5 shrink-0" />
              Telas
            </button>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 sm:text-sm">
              BCG TV
            </span>
          )}
          <span className="text-xs text-zinc-500 tabular-nums sm:text-sm">
            {hallReady && sync ? (
              sync.paused ? (
                <span className="text-amber-400">Pausado</span>
              ) : (
                <span className="text-emerald-400">No ar</span>
              )
            ) : (
              "—"
            )}
          </span>
        </div>
      </div>

      {/* Área principal */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col"
          style={{
            paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
            paddingRight: "max(0.75rem, env(safe-area-inset-right))",
          }}
        >
            {loading && screens.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-4 text-sm text-zinc-500 sm:text-base">
                Carregando…
              </div>
            ) : picked ? (
              <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col py-4 sm:max-w-xl sm:py-6">
                <div className="mb-5 text-center sm:mb-6">
                  <p className="text-3xl font-bold tabular-nums text-white sm:text-4xl md:text-5xl">
                    {pickedNum ?? "—"}
                  </p>
                  <p className="mt-1.5 text-sm text-zinc-400 sm:text-base">
                    {hallScreenShortLabel(picked.name)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <IpadTouchButton
                    active={pickMode === BOSTON_TV_HALL_SYNC_FOLLOW}
                    onClick={() => setPickMode(BOSTON_TV_HALL_SYNC_FOLLOW)}
                  >
                    {BC_HALL_LABEL}
                  </IpadTouchButton>
                  <IpadTouchButton
                    active={pickMode === BOSTON_TV_HALL_SYNC_INDEPENDENT}
                    onClick={() => setPickMode(BOSTON_TV_HALL_SYNC_INDEPENDENT)}
                  >
                    Individual
                  </IpadTouchButton>
                </div>

                {pickMode === BOSTON_TV_HALL_SYNC_INDEPENDENT ? (
                  <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain sm:mt-5">
                    {playlists.length === 0 ? (
                      <p className="py-8 text-center text-sm text-zinc-500 sm:text-base">
                        Nenhuma playlist.
                      </p>
                    ) : (
                      playlists.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPickPlaylistId(p.id)}
                          className={cn(
                            "flex min-h-[52px] w-full items-center rounded-xl border px-4 text-left text-sm font-medium touch-manipulation active:scale-[0.98] sm:min-h-[56px] sm:text-base",
                            pickPlaylistId === p.id
                              ? "border-violet-400/60 bg-violet-500/20 text-white"
                              : "border-zinc-800 bg-zinc-900 text-zinc-200",
                          )}
                        >
                          <span className="line-clamp-2">{p.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="mt-6 flex flex-1 items-center justify-center px-4 sm:mt-8">
                    <p className="max-w-xs text-center text-sm leading-relaxed text-zinc-500 sm:text-base">
                      Sincronizada com o {BC_HALL_LABEL}
                    </p>
                  </div>
                )}

                <div className="mt-4 shrink-0 pt-2 sm:mt-6">
                  <IpadTouchButton
                    disabled={acting}
                    className="border-violet-500/50 bg-violet-600 text-white hover:bg-violet-500"
                    onClick={() => void applyScreenMode()}
                  >
                    Aplicar
                  </IpadTouchButton>
                </div>
              </div>
            ) : ipadTab === "telas" ? (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 sm:py-4">
                <ul className="mx-auto grid w-full grid-cols-[repeat(auto-fill,minmax(4.75rem,6.25rem))] justify-center gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(5.25rem,6.75rem))] sm:gap-3 md:grid-cols-[repeat(auto-fill,minmax(5.5rem,7rem))]">
                  {sortedScreens.map((s) => {
                    const num = parseHallScreenNum(s.name);
                    const isIndependent =
                      s.displayMode === "playlist" &&
                      normalizeHallSyncMode(s.hallSyncMode) === BOSTON_TV_HALL_SYNC_INDEPENDENT;
                    const isIptv = s.displayMode === "iptv";
                    return (
                      <li key={s.id} className="flex justify-center">
                        <button
                          type="button"
                          className={cn(
                            "flex aspect-square w-full max-w-[7rem] flex-col items-center justify-center rounded-2xl border px-1 py-2 text-center transition-transform touch-manipulation active:scale-[0.96] sm:max-w-[7.5rem]",
                            isIndependent
                              ? "border-violet-500/45 bg-violet-500/15"
                              : isIptv
                                ? "border-sky-500/40 bg-sky-500/10"
                                : "border-emerald-500/35 bg-emerald-500/10",
                          )}
                          onClick={() => openScreen(s)}
                        >
                          <span className="text-xl font-bold tabular-nums leading-none text-white sm:text-2xl">
                            {num ?? "—"}
                          </span>
                          <span
                            className={cn(
                              "mt-1.5 max-w-full truncate rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide sm:mt-2 sm:px-2 sm:text-[9px]",
                              isIptv
                                ? "bg-sky-500/30 text-sky-100"
                                : isIndependent
                                  ? "bg-violet-500/30 text-violet-100"
                                  : "bg-emerald-500/30 text-emerald-100",
                            )}
                          >
                            {isIptv ? "IPTV" : hallSyncModeLabel(s.hallSyncMode)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : !hallReady ? (
              <div className="flex flex-1 items-center justify-center px-6 py-8 text-center text-sm text-amber-200/90 sm:max-w-lg sm:mx-auto sm:text-base">
                {channel && !channel.configured
                  ? channel.message
                  : `Ative o ${BC_HALL_LABEL} em BCG TV.`}
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-2 py-6 sm:max-w-lg sm:px-4 sm:py-8">
                <p className="mb-1 text-center text-sm text-zinc-400 sm:text-base">
                  <span className="line-clamp-2">{channel.playlistName}</span>
                  {sync ? (
                    <span className="mt-1 block text-xs tabular-nums text-zinc-500 sm:text-sm">
                      Item #{sync.itemIndex + 1} · {formatHallOffsetMs(sync.offsetMs)}
                    </span>
                  ) : null}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {sync?.paused ? (
                    <IpadTouchButton
                      disabled={acting}
                      className="col-span-2 border-emerald-500/40 bg-emerald-600/80 text-white"
                      onClick={() => void hallAction("play")}
                    >
                      <Play className="h-5 w-5" />
                      Continuar
                    </IpadTouchButton>
                  ) : (
                    <>
                      <IpadTouchButton disabled={acting} onClick={() => void hallAction("pause")}>
                        <Pause className="h-5 w-5" />
                        Pausar
                      </IpadTouchButton>
                      <IpadTouchButton disabled={acting} onClick={() => void hallAction("next")}>
                        <SkipForward className="h-5 w-5" />
                        Próximo
                      </IpadTouchButton>
                    </>
                  )}
                  <IpadTouchButton disabled={acting} onClick={() => void hallAction("restart")}>
                    <RotateCcw className="h-5 w-5" />
                    Reiniciar
                  </IpadTouchButton>
                  <IpadTouchButton disabled={acting} onClick={() => setResetAllOpen(true)}>
                    <Users className="h-5 w-5" />
                    Todas → {BC_HALL_LABEL}
                  </IpadTouchButton>
                </div>
              </div>
            )}
        </div>

        {/* Tab bar inferior — largura total, safe area */}
        {!picked ? (
          <nav
            className="grid shrink-0 grid-cols-2 border-t border-zinc-800 bg-zinc-900/90"
            style={{
              paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
              paddingLeft: "max(0rem, env(safe-area-inset-left))",
              paddingRight: "max(0rem, env(safe-area-inset-right))",
            }}
          >
            <button
              type="button"
              onClick={() => setIpadTab("telas")}
              className={cn(
                "min-h-[52px] text-sm font-semibold touch-manipulation sm:min-h-[56px] sm:text-base",
                ipadTab === "telas" ? "text-white" : "text-zinc-500",
              )}
            >
              Telas
            </button>
            <button
              type="button"
              onClick={() => setIpadTab("bc-hall")}
              className={cn(
                "min-h-[52px] text-sm font-semibold touch-manipulation sm:min-h-[56px] sm:text-base",
                ipadTab === "bc-hall" ? "text-violet-300" : "text-zinc-500",
              )}
            >
              {BC_HALL_LABEL}
            </button>
          </nav>
        ) : null}
      </div>

      <AlertDialog open={resetAllOpen} onOpenChange={setResetAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voltar todas ao {BC_HALL_LABEL}?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as telas em modo playlist voltam a seguir o {BC_HALL_LABEL}.
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
