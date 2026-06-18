"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clipboard, ExternalLink, LayoutList, Pencil, Plus, Radio, RefreshCw, Trash2, Tv, TabletSmartphone, Antenna, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { BostonTvIptvPanel } from "@/components/boston-tv/BostonTvIptvPanel";
import { BostonTvVmixPanel } from "@/components/boston-tv/BostonTvVmixPanel";
import { BostonTvEnabledChannelSelect } from "@/components/boston-tv/BostonTvEnabledChannelSelect";
import { BostonTvHallChannelPanel } from "@/components/boston-tv/BostonTvHallChannelPanel";
import { BostonTvDashboardTabs } from "@/components/boston-tv/BostonTvDashboardTabs";
import { parseHallScreenNum, hallSyncModeLabel, normalizeHallSyncMode, BOSTON_TV_HALL_SYNC_FOLLOW, BOSTON_TV_HALL_SYNC_INDEPENDENT, type HallSyncMode } from "@/lib/boston-tv-hall";
import { ModalNativeSelect } from "@/components/ui/modal-native-select";
import {
  getStoredBostonTvTenantId,
  pickBostonTvTenantId,
  setStoredBostonTvTenantId,
} from "@/lib/boston-tv-tenant-storage";

interface Tenant {
  id: string;
  name: string;
}

interface PlaylistRow {
  id: string;
  name: string;
  tenantId: string;
  _count?: { items: number };
}

interface ScreenRow {
  id: string;
  name: string;
  locationHint: string | null;
  playerToken: string;
  displayMode: string;
  hallSyncMode: string;
  scheduleTimezone: string;
  weeklySchedule: unknown;
  playlist: { id: string; name: string } | null;
  iptvChannel: { id: string; name: string; groupTitle: string | null } | null;
}

type ScreenContentMode = "iptv" | "playlist" | "empty";

type BostonTvTab = "hall" | "playlists" | "screens" | "vmix" | "iptv";

const DEFAULT_SCHEDULE = '[\n  { "weekdays": [1,2,3,4,5], "start": "08:00", "end": "22:00" }\n]';

function contentModeFromScreen(s: ScreenRow): ScreenContentMode {
  if (s.displayMode === "iptv" && s.iptvChannel) return "iptv";
  if (s.playlist) return "playlist";
  return "empty";
}

function screenContentLabel(s: ScreenRow): string {
  if (s.displayMode === "iptv" && s.iptvChannel) {
    return `Canal: ${s.iptvChannel.name}`;
  }
  if (s.playlist) {
    return `Playlist: ${s.playlist.name}`;
  }
  return "Sem conteúdo — clique Editar";
}

function screenPublicUrl(s: ScreenRow, base: string): string {
  const hallNum = parseHallScreenNum(s.name);
  if (hallNum != null) return `${base}/tv/${hallNum}`;
  return `${base}/tv/play/${s.playerToken}`;
}

export default function BostonTvDashboardPage() {
  const { tenantIds, canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantFilter, setTenantFilter] = useState(() => getStoredBostonTvTenantId() ?? "");

  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [screens, setScreens] = useState<ScreenRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [newPlOpen, setNewPlOpen] = useState(false);
  const [newPlName, setNewPlName] = useState("");

  const [newScreenOpen, setNewScreenOpen] = useState(false);
  const [editScreen, setEditScreen] = useState<ScreenRow | null>(null);
  const [screenName, setScreenName] = useState("");
  const [screenLocation, setScreenLocation] = useState("");
  const [screenContentMode, setScreenContentMode] = useState<ScreenContentMode>("playlist");
  const [screenHallSyncMode, setScreenHallSyncMode] = useState<HallSyncMode>(BOSTON_TV_HALL_SYNC_FOLLOW);
  const [screenPlaylistId, setScreenPlaylistId] = useState("");
  const [screenIptvChannelId, setScreenIptvChannelId] = useState("");
  const [screenScheduleJson, setScreenScheduleJson] = useState(DEFAULT_SCHEDULE);

  const [activeTab, setActiveTab] = useState<BostonTvTab>("hall");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const showFeedback = (message: string, title = "Atenção") => {
    setFeedback({ title, message });
  };

  const [deleteScreenId, setDeleteScreenId] = useState<string | null>(null);
  const [regenerateScreenId, setRegenerateScreenId] = useState<string | null>(null);
  const [screenActionLoading, setScreenActionLoading] = useState(false);

  const [editPl, setEditPl] = useState<PlaylistRow | null>(null);
  const [editPlName, setEditPlName] = useState("");
  const [deletePlaylistId, setDeletePlaylistId] = useState<string | null>(null);
  const [playlistActionLoading, setPlaylistActionLoading] = useState(false);

  const effectiveTenant = tenantFilter;

  const bostonTvTabs = useMemo(
    () =>
      [
        { id: "hall" as const, label: "Canal Hall", icon: Radio },
        { id: "playlists" as const, label: "Playlists", icon: LayoutList },
        { id: "screens" as const, label: "Telas", icon: Tv },
        { id: "vmix" as const, label: "Fontes vMix", icon: Video },
        { id: "iptv" as const, label: "IPTV", icon: Antenna },
      ],
    [],
  );

  const refresh = useCallback(async () => {
    if (!effectiveTenant) {
      setPlaylists([]);
      setScreens([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [pl, sc] = await Promise.all([
        api.get<PlaylistRow[]>(`/boston-tv/playlists?tenantId=${encodeURIComponent(effectiveTenant)}`),
        api.get<ScreenRow[]>(`/boston-tv/screens?tenantId=${encodeURIComponent(effectiveTenant)}`),
      ]);
      setPlaylists(pl.data ?? []);
      setScreens(sc.data ?? []);
    } catch {
      setPlaylists([]);
      setScreens([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveTenant]);

  useEffect(() => {
    void (async () => {
      setTenantsLoading(true);
      try {
        const { data } = await api.get<Tenant[]>("/tenants");
        const list = Array.isArray(data) ? data : [];
        setTenants(list);
        setTenantFilter((cur) => pickBostonTvTenantId(list, cur, tenantIds));
      } catch {
        setTenants([]);
      } finally {
        setTenantsLoading(false);
      }
    })();
  }, [tenantIds]);

  useEffect(() => {
    if (tenantFilter) setStoredBostonTvTenantId(tenantFilter);
  }, [tenantFilter]);

  const tenantSelectValue = useMemo(() => {
    if (tenantsLoading) return "_loading";
    if (effectiveTenant && tenants.some((t) => t.id === effectiveTenant)) return effectiveTenant;
    return "_none";
  }, [tenantsLoading, effectiveTenant, tenants]);

  const playlistOptions = useMemo(() => {
    const list = [...playlists];
    const saved = editScreen?.playlist;
    if (saved && !list.some((p) => p.id === saved.id)) {
      list.unshift({ id: saved.id, name: saved.name, tenantId: effectiveTenant });
    }
    return list;
  }, [playlists, editScreen, effectiveTenant]);

  const playlistSelectValue = useMemo(() => {
    if (!screenPlaylistId) return "";
    return playlistOptions.some((p) => p.id === screenPlaylistId) ? screenPlaylistId : "";
  }, [screenPlaylistId, playlistOptions]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetScreenForm = () => {
    setScreenName("");
    setScreenLocation("");
    setScreenContentMode("playlist");
    setScreenHallSyncMode(BOSTON_TV_HALL_SYNC_FOLLOW);
    setScreenPlaylistId("");
    setScreenIptvChannelId("");
    setScreenScheduleJson(DEFAULT_SCHEDULE);
    setEditScreen(null);
  };

  const openNewScreen = () => {
    resetScreenForm();
    setScreenContentMode("playlist");
    setScreenHallSyncMode(BOSTON_TV_HALL_SYNC_FOLLOW);
    if (playlists.length > 0) {
      setScreenPlaylistId(playlists[0].id);
    }
    setNewScreenOpen(true);
  };

  const openEditScreen = (s: ScreenRow) => {
    setEditScreen(s);
    setScreenName(s.name);
    setScreenLocation(s.locationHint ?? "");
    setScreenContentMode(contentModeFromScreen(s));
    setScreenHallSyncMode(normalizeHallSyncMode(s.hallSyncMode));
    setScreenPlaylistId(s.playlist?.id ?? "");
    setScreenIptvChannelId(s.iptvChannel?.id ?? "");
    setScreenScheduleJson(
      s.weeklySchedule ? JSON.stringify(s.weeklySchedule, null, 2) : "",
    );
    setNewScreenOpen(true);
  };

  const createPlaylist = async () => {
    if (!effectiveTenant || !newPlName.trim()) return;
    await api.post("/boston-tv/playlists", {
      tenantId: effectiveTenant,
      name: newPlName.trim(),
    });
    setNewPlOpen(false);
    setNewPlName("");
    await refresh();
  };

  const openEditPlaylist = (p: PlaylistRow) => {
    setEditPl(p);
    setEditPlName(p.name);
  };

  const savePlaylistName = async () => {
    if (!editPl || !editPlName.trim()) return;
    setPlaylistActionLoading(true);
    try {
      await api.patch(`/boston-tv/playlists/${editPl.id}`, { name: editPlName.trim() });
      setEditPl(null);
      setEditPlName("");
      await refresh();
    } finally {
      setPlaylistActionLoading(false);
    }
  };

  const deletePlaylist = async () => {
    if (!deletePlaylistId) return;
    setPlaylistActionLoading(true);
    try {
      await api.delete(`/boston-tv/playlists/${deletePlaylistId}`);
      setDeletePlaylistId(null);
      await refresh();
    } finally {
      setPlaylistActionLoading(false);
    }
  };

  const parseSchedule = (): unknown | undefined | null => {
    const raw = screenScheduleJson.trim();
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      showFeedback("JSON da agenda inválido. Deixe vazio para 24h ou use o exemplo.", "Agenda inválida");
      return null;
    }
  };

  const buildScreenPayload = () => {
    if (screenContentMode === "iptv") {
      if (!screenIptvChannelId) {
        showFeedback("Escolha um canal IPTV liberado.");
        return null;
      }
      return {
        displayMode: "iptv" as const,
        iptvChannelId: screenIptvChannelId,
        playlistId: null,
      };
    }
    if (screenContentMode === "playlist") {
      if (
        screenHallSyncMode === BOSTON_TV_HALL_SYNC_INDEPENDENT &&
        !screenPlaylistId
      ) {
        showFeedback("Modo individual exige uma playlist na tela.");
        return null;
      }
      return {
        displayMode: "playlist" as const,
        playlistId: screenPlaylistId || null,
        iptvChannelId: null,
        hallSyncMode: screenHallSyncMode,
      };
    }
    return {
      displayMode: "playlist" as const,
      playlistId: null,
      iptvChannelId: null,
    };
  };

  const saveScreen = async () => {
    if (!effectiveTenant || !screenName.trim()) return;
    const weekly = parseSchedule();
    if (weekly === null) return;
    const content = buildScreenPayload();
    if (!content) return;

    if (editScreen) {
      await api.patch(`/boston-tv/screens/${editScreen.id}`, {
        name: screenName.trim(),
        locationHint: screenLocation.trim() || null,
        ...content,
        weeklySchedule: weekly,
      });
    } else {
      await api.post("/boston-tv/screens", {
        tenantId: effectiveTenant,
        name: screenName.trim(),
        locationHint: screenLocation.trim() || undefined,
        ...content,
        weeklySchedule: weekly,
      });
    }

    setNewScreenOpen(false);
    resetScreenForm();
    await refresh();
  };

  const copyPlayUrl = (screen: ScreenRow) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    void navigator.clipboard.writeText(screenPublicUrl(screen, base));
  };

  const openPlayUrl = (screen: ScreenRow) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    window.open(screenPublicUrl(screen, base), "_blank", "noopener,noreferrer");
  };

  const deleteScreen = async () => {
    if (!deleteScreenId) return;
    setScreenActionLoading(true);
    try {
      await api.delete(`/boston-tv/screens/${deleteScreenId}`);
      setDeleteScreenId(null);
      await refresh();
    } finally {
      setScreenActionLoading(false);
    }
  };

  const regenerate = async () => {
    if (!regenerateScreenId) return;
    setScreenActionLoading(true);
    try {
      await api.post(`/boston-tv/screens/${regenerateScreenId}/regenerate-token`, {});
      setRegenerateScreenId(null);
      await refresh();
    } finally {
      setScreenActionLoading(false);
    }
  };

  if (!canAccessModule("boston_tv") && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>Você não tem acesso ao módulo BCG TV.</p>
        <Link href="/dashboard">
          <Button variant="link" className="mt-2">
            Voltar ao dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Empresa / clube</Label>
        <Select
          value={tenantSelectValue}
          onValueChange={(v) => {
            if (v === "_loading" || v === "_none") return;
            setTenantFilter(v);
            setStoredBostonTvTenantId(v);
          }}
          disabled={tenantsLoading || tenants.length === 0}
        >
          <SelectTrigger className="w-full max-w-[280px] text-foreground">
            <SelectValue placeholder="Selecione a empresa" />
          </SelectTrigger>
          <SelectContent>
            {tenantsLoading ? (
              <SelectItem value="_loading" disabled>
                Carregando empresas…
              </SelectItem>
            ) : tenants.length === 0 ? (
              <SelectItem value="_none" disabled>
                Nenhuma empresa disponível
              </SelectItem>
            ) : (
              tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/25 via-zinc-950/40 to-background p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <BostonTvDashboardTabs tabs={bostonTvTabs} active={activeTab} onChange={setActiveTab} />
          <Link href="/dashboard/marketing/boston-tv/controle-hall" className="shrink-0">
            <Button
              type="button"
              variant="default"
              className="min-h-[48px] w-full border border-violet-400/30 bg-gradient-to-r from-violet-600 to-violet-500 shadow-[0_4px_20px_-6px_rgba(139,92,246,0.6)] hover:from-violet-500 hover:to-violet-400 lg:w-auto"
            >
              <TabletSmartphone className="mr-2 h-4 w-4" />
              Controle Hall (iPad)
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {!effectiveTenant ? (
            <p className="text-sm text-muted-foreground">Selecione uma empresa para configurar o BCG TV.</p>
          ) : activeTab === "hall" ? (
            <BostonTvHallChannelPanel tenantId={effectiveTenant} onScreensReset={refresh} embedded />
          ) : activeTab === "playlists" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Playlists BCG TV</p>
                <Button size="sm" onClick={() => setNewPlOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova playlist
                </Button>
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : playlists.length === 0 ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Nenhuma playlist. Crie uma e adicione imagens/vídeos.</p>
                  <Button size="sm" variant="outline" onClick={() => setNewPlOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar primeira playlist
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-md border">
                  {playlists.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-col gap-3 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {p._count?.items ?? 0} item(ns)
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <Link href={`/dashboard/marketing/boston-tv/playlists/${p.id}`}>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            Editar itens
                          </Button>
                        </Link>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditPlaylist(p)}
                          aria-label={`Renomear playlist ${p.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeletePlaylistId(p.id)}
                          aria-label={`Apagar playlist ${p.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : activeTab === "screens" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Telas do Hall</p>
                <Button size="sm" onClick={openNewScreen}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova tela
                </Button>
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : screens.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma tela ainda. Clique <strong>Nova tela</strong> e escolha o canal ou a playlist.
                </p>
              ) : (
                <>
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    Instalação no Hall: abra{" "}
                    <a href="/tv" target="_blank" rel="noopener noreferrer" className="font-mono underline">
                      /tv
                    </a>{" "}
                    na Smart TV (dropdown + Abrir). Favorito curto por tela:{" "}
                    <span className="font-mono">/tv/1</span> … <span className="font-mono">/tv/21</span>.
                  </p>
                  <ul className="space-y-3">
                    {screens.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-lg border border-border p-3 text-sm flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{s.name}</p>
                            {s.displayMode === "playlist" ? (
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                  normalizeHallSyncMode(s.hallSyncMode) === BOSTON_TV_HALL_SYNC_INDEPENDENT
                                    ? "bg-violet-500/20 text-violet-200"
                                    : "bg-emerald-500/20 text-emerald-200"
                                }`}
                              >
                                {hallSyncModeLabel(s.hallSyncMode)}
                              </span>
                            ) : null}
                          </div>
                          {s.locationHint ? (
                            <p className="text-xs text-muted-foreground">{s.locationHint}</p>
                          ) : null}
                          <p className="text-xs mt-2 font-medium text-foreground truncate" title={screenContentLabel(s)}>
                            {screenContentLabel(s)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <Button type="button" variant="default" size="sm" onClick={() => openPlayUrl(s)}>
                            <ExternalLink className="mr-1 h-4 w-4" />
                            Abrir na TV
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => copyPlayUrl(s)}>
                            <Clipboard className="mr-1 h-4 w-4" />
                            Copiar link
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => openEditScreen(s)}>
                            <Tv className="mr-1 h-4 w-4" />
                            Editar
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setRegenerateScreenId(s.id)}>
                            <RefreshCw className="mr-1 h-4 w-4" />
                            Novo token
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDeleteScreenId(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : activeTab === "vmix" ? (
            <BostonTvVmixPanel tenantId={effectiveTenant} embedded />
          ) : (
            <BostonTvIptvPanel tenantId={effectiveTenant} embedded />
          )}
        </CardContent>
      </Card>

      <Dialog open={newPlOpen} onOpenChange={setNewPlOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pl-name">Nome</Label>
            <Input
              id="pl-name"
              value={newPlName}
              onChange={(e) => setNewPlName(e.target.value)}
              placeholder="Ex.: Vídeos comerciais Hall"
              className="text-foreground"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPlOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void createPlaylist()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editPl}
        onOpenChange={(open) => {
          if (!open) {
            setEditPl(null);
            setEditPlName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-pl-name">Nome</Label>
            <Input
              id="edit-pl-name"
              value={editPlName}
              onChange={(e) => setEditPlName(e.target.value)}
              className="text-foreground"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPl(null)} disabled={playlistActionLoading}>
              Cancelar
            </Button>
            <Button onClick={() => void savePlaylistName()} disabled={playlistActionLoading || !editPlName.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePlaylistId} onOpenChange={(open) => !open && setDeletePlaylistId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esta playlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os itens da playlist serão removidos.
              {deletePlaylistId &&
              screens.some((s) => s.playlist?.id === deletePlaylistId) ? (
                <>
                  {" "}
                  Telas que usam esta playlist ficarão <strong>sem conteúdo</strong> até você escolher outra.
                </>
              ) : null}{" "}
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={playlistActionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={playlistActionLoading}
              onClick={(e) => {
                e.preventDefault();
                void deletePlaylist();
              }}
            >
              Apagar playlist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={newScreenOpen}
        onOpenChange={(open) => {
          setNewScreenOpen(open);
          if (!open) resetScreenForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editScreen ? "Editar tela" : "Nova tela (TV)"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sc-name">Nome da TV *</Label>
              <Input
                id="sc-name"
                value={screenName}
                onChange={(e) => setScreenName(e.target.value)}
                placeholder="Ex.: 1 - USA"
                className="text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-loc">Local (opcional)</Label>
              <Input
                id="sc-loc"
                value={screenLocation}
                onChange={(e) => setScreenLocation(e.target.value)}
                placeholder="Ex.: Canto inferior"
                className="text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sc-content-mode">O que esta TV exibe? *</Label>
              <ModalNativeSelect
                id="sc-content-mode"
                value={screenContentMode}
                onChange={(v) => setScreenContentMode(v as ScreenContentMode)}
                placeholder="Escolha o tipo"
                options={[
                  {
                    value: "playlist",
                    label: "Playlist (Hall ou individual — imagens, vídeos, YouTube, vMix, IPTV no loop)",
                  },
                  {
                    value: "iptv",
                    label: "Canal IPTV fixo (1 canal ao vivo o dia todo, sem playlist)",
                  },
                  { value: "empty", label: "Nada por enquanto" },
                ]}
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {screenContentMode === "playlist" ? (
                  <>
                    <strong className="text-foreground">Imagens, vídeos e YouTube</strong> não ficam
                    aqui — monte na playlist em{" "}
                    <strong className="text-foreground">Editar itens</strong> (lista de playlists
                    acima). Abaixo você escolhe se esta TV segue o Canal Hall ou uma playlist só
                    dela.
                  </>
                ) : screenContentMode === "iptv" ? (
                  <>Canal ao vivo direto nesta TV, sem loop de playlist.</>
                ) : (
                  <>Tela cadastrada, sem conteúdo até você configurar.</>
                )}
              </p>
            </div>

            {screenContentMode === "playlist" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sc-hall-sync">Sincronização com o Hall</Label>
                  <ModalNativeSelect
                    id="sc-hall-sync"
                    value={screenHallSyncMode}
                    onChange={(v) => setScreenHallSyncMode(v as HallSyncMode)}
                    options={[
                      {
                        value: BOSTON_TV_HALL_SYNC_FOLLOW,
                        label: "Seguir Canal Hall (sincronizada com as demais)",
                      },
                      {
                        value: BOSTON_TV_HALL_SYNC_INDEPENDENT,
                        label: "Individual (playlist própria, ex.: tutorial Argentina)",
                      },
                    ]}
                  />
                  {screenHallSyncMode === BOSTON_TV_HALL_SYNC_FOLLOW ? (
                    <p className="text-xs text-muted-foreground">
                      Usa a playlist ativa do Canal Hall. Pausar/Próximo no painel acima
                      afetam esta tela. Para incluir{" "}
                      <strong className="text-foreground">imagens ou vídeos</strong>, edite os
                      itens dessa playlist em{" "}
                      <strong className="text-foreground">Editar itens</strong> na lista acima.
                    </p>
                  ) : null}
                </div>

                {screenHallSyncMode === BOSTON_TV_HALL_SYNC_INDEPENDENT ? (
                  <div className="space-y-2">
                    <Label htmlFor="sc-playlist">Playlist da TV *</Label>
                    {playlists.length === 0 ? (
                      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground space-y-2">
                        <p>Crie uma playlist acima antes de associar à tela.</p>
                        <Button type="button" size="sm" variant="secondary" onClick={() => setNewPlOpen(true)}>
                          Criar playlist
                        </Button>
                      </div>
                    ) : (
                      <ModalNativeSelect
                        id="sc-playlist"
                        value={playlistSelectValue}
                        onChange={setScreenPlaylistId}
                        placeholder="Escolha a playlist"
                        options={playlistOptions.map((p) => ({
                          value: p.id,
                          label: `${p.name} (${p._count?.items ?? 0} itens)`,
                        }))}
                      />
                    )}
                  </div>
                ) : null}
              </>
            ) : null}

            {screenContentMode === "iptv" && effectiveTenant ? (
              <BostonTvEnabledChannelSelect
                tenantId={effectiveTenant}
                value={screenIptvChannelId}
                onChange={setScreenIptvChannelId}
                fallbackChannel={editScreen?.iptvChannel ?? undefined}
                id="sc-iptv-channel"
              />
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="sc-sch">Horário (JSON, opcional)</Label>
              <Textarea
                id="sc-sch"
                rows={4}
                className="font-mono text-xs text-foreground"
                value={screenScheduleJson}
                onChange={(e) => setScreenScheduleJson(e.target.value)}
                placeholder="Vazio = 24h"
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para 24h. Fora do horário = tela preta (blecaute).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewScreenOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveScreen()}>
              {editScreen ? "Salvar" : "Criar tela"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteScreenId} onOpenChange={(open) => !open && setDeleteScreenId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover esta tela?</AlertDialogTitle>
            <AlertDialogDescription>
              O link do player deixará de funcionar nesta TV. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={screenActionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={screenActionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void deleteScreen()}
            >
              Remover tela
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!regenerateScreenId} onOpenChange={(open) => !open && setRegenerateScreenId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar novo token?</AlertDialogTitle>
            <AlertDialogDescription>
              O link atual na TV deixará de funcionar. Será necessário abrir ou copiar o novo link em cada aparelho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={screenActionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={screenActionLoading} onClick={() => void regenerate()}>
              Gerar novo token
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
