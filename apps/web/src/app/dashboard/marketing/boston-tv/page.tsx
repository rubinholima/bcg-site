"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clipboard, ExternalLink, Plus, RefreshCw, Trash2, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { BostonTvEnabledChannelSelect } from "@/components/boston-tv/BostonTvEnabledChannelSelect";
import { BostonTvCollapsibleSection } from "@/components/boston-tv/BostonTvCollapsibleSection";
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
  scheduleTimezone: string;
  weeklySchedule: unknown;
  playlist: { id: string; name: string } | null;
  iptvChannel: { id: string; name: string; groupTitle: string | null } | null;
}

type ScreenContentMode = "iptv" | "playlist" | "empty";

const DEFAULT_SCHEDULE = '[\n  { "weekdays": [1,2,3,4,5], "start": "08:00", "end": "22:00" }\n]';

function contentModeFromScreen(s: ScreenRow): ScreenContentMode {
  if (s.displayMode === "iptv" && s.iptvChannel) return "iptv";
  if (s.playlist) return "playlist";
  return "empty";
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
  const [screenPlaylistId, setScreenPlaylistId] = useState("");
  const [screenIptvChannelId, setScreenIptvChannelId] = useState("");
  const [screenScheduleJson, setScreenScheduleJson] = useState(DEFAULT_SCHEDULE);

  const [playlistsOpen, setPlaylistsOpen] = useState(true);
  const [screensOpen, setScreensOpen] = useState(true);
  const [iptvOpen, setIptvOpen] = useState(true);

  const [deleteScreenId, setDeleteScreenId] = useState<string | null>(null);
  const [regenerateScreenId, setRegenerateScreenId] = useState<string | null>(null);
  const [screenActionLoading, setScreenActionLoading] = useState(false);

  const effectiveTenant = tenantFilter;

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
    setScreenPlaylistId("");
    setScreenIptvChannelId("");
    setScreenScheduleJson(DEFAULT_SCHEDULE);
    setEditScreen(null);
  };

  const openNewScreen = () => {
    resetScreenForm();
    setScreenContentMode("playlist");
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

  const parseSchedule = (): unknown | undefined | null => {
    const raw = screenScheduleJson.trim();
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      alert("JSON da agenda inválido. Deixe vazio para 24h ou use o exemplo.");
      return null;
    }
  };

  const buildScreenPayload = () => {
    if (screenContentMode === "iptv") {
      if (!screenIptvChannelId) {
        alert("Escolha um canal IPTV liberado.");
        return null;
      }
      return {
        displayMode: "iptv" as const,
        iptvChannelId: screenIptvChannelId,
        playlistId: null,
      };
    }
    if (screenContentMode === "playlist") {
      if (!screenPlaylistId) {
        alert("Escolha a playlist da TV.");
        return null;
      }
      return {
        displayMode: "playlist" as const,
        playlistId: screenPlaylistId,
        iptvChannelId: null,
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

  const copyPlayUrl = (token: string) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    void navigator.clipboard.writeText(`${base}/tv/play/${token}`);
  };

  const openPlayUrl = (token: string) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    window.open(`${base}/tv/play/${token}`, "_blank", "noopener,noreferrer");
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
        <p>Você não tem acesso ao módulo Boston TV.</p>
        <Link href="/dashboard">
          <Button variant="link" className="mt-2">
            Voltar ao dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-4">
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
            <SelectTrigger className="w-[280px] text-foreground">
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
      </div>

      <BostonTvCollapsibleSection
        title="Playlists (marketing)"
        open={playlistsOpen}
        onOpenChange={setPlaylistsOpen}
        actions={
          <Button size="sm" onClick={() => setNewPlOpen(true)} disabled={!effectiveTenant}>
            <Plus className="mr-2 h-4 w-4" />
            Nova playlist
          </Button>
        }
      >
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
              <li key={p.id} className="flex flex-col gap-2 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground text-xs">
                  {p._count?.items ?? 0} item(ns)
                </span>
                <Link href={`/dashboard/marketing/boston-tv/playlists/${p.id}`}>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    Editar itens
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </BostonTvCollapsibleSection>

      <BostonTvCollapsibleSection
        title="Telas (TVs)"
        open={screensOpen}
        onOpenChange={setScreensOpen}
        actions={
          <Button size="sm" onClick={openNewScreen} disabled={!effectiveTenant}>
            <Plus className="mr-2 h-4 w-4" />
            Nova tela
          </Button>
        }
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : screens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma tela ainda. Clique <strong>Nova tela</strong> e escolha o canal ou a playlist.
          </p>
        ) : (
          <ul className="space-y-3">
            {screens.map((s) => {
              const base = typeof window !== "undefined" ? window.location.origin : "";
              const url = `${base}/tv/play/${s.playerToken}`;
              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-border p-3 text-sm flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.name}</p>
                    {s.locationHint ? (
                      <p className="text-xs text-muted-foreground">{s.locationHint}</p>
                    ) : null}
                    <p className="text-xs mt-2 font-medium text-foreground">
                      {s.displayMode === "iptv" && s.iptvChannel
                        ? `Canal: ${s.iptvChannel.name}`
                        : s.playlist
                          ? `Marketing: ${s.playlist.name}`
                          : "Sem conteúdo — clique Editar"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 break-all">{url}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button type="button" variant="default" size="sm" onClick={() => openPlayUrl(s.playerToken)}>
                      <ExternalLink className="mr-1 h-4 w-4" />
                      Abrir na TV
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => copyPlayUrl(s.playerToken)}>
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
              );
            })}
          </ul>
        )}
      </BostonTvCollapsibleSection>

      {effectiveTenant ? (
        <BostonTvCollapsibleSection
          title="IPTV (lista M3U)"
          open={iptvOpen}
          onOpenChange={setIptvOpen}
        >
          <BostonTvIptvPanel tenantId={effectiveTenant} embedded />
        </BostonTvCollapsibleSection>
      ) : null}

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
                    label: "Playlist da TV (imagens, vídeos, YouTube, live em loop)",
                  },
                  {
                    value: "iptv",
                    label: "Canal IPTV fixo (1 canal ao vivo o dia todo)",
                  },
                  { value: "empty", label: "Nada por enquanto" },
                ]}
              />
            </div>

            {screenContentMode === "playlist" ? (
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
    </div>
  );
}
