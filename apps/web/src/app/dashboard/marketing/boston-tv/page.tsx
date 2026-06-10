"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clipboard, Plus, RefreshCw, Trash2, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function BostonTvDashboardPage() {
  const { tenantIds, canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantFilter, setTenantFilter] = useState("");

  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [screens, setScreens] = useState<ScreenRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [newPlOpen, setNewPlOpen] = useState(false);
  const [newPlName, setNewPlName] = useState("");
  const [newScreenOpen, setNewScreenOpen] = useState(false);
  const [newScreenName, setNewScreenName] = useState("");
  const [newScreenLocation, setNewScreenLocation] = useState("");
  const [newScreenPlaylistId, setNewScreenPlaylistId] = useState<string>("");
  const [newScreenScheduleJson, setNewScreenScheduleJson] = useState(
    '[\n  { "weekdays": [1,2,3,4,5], "start": "08:00", "end": "22:00" }\n]',
  );
  const [assignScreenId, setAssignScreenId] = useState<string | null>(null);

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
      try {
        const { data } = await api.get<Tenant[]>("/tenants");
        const list = Array.isArray(data) ? data : [];
        setTenants(list);
        setTenantFilter((cur) => {
          if (cur) return cur;
          if (tenantIds?.length === 1) return tenantIds[0];
          return list[0]?.id ?? "";
        });
      } catch {
        setTenants([]);
      }
    })();
  }, [tenantIds]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const createScreen = async () => {
    if (!effectiveTenant || !newScreenName.trim()) return;
    let weekly: unknown = undefined;
    const raw = newScreenScheduleJson.trim();
    if (raw) {
      try {
        weekly = JSON.parse(raw) as unknown;
      } catch {
        alert("JSON da agenda inválido. Use o exemplo como base ou deixe vazio para 24h.");
        return;
      }
    }
    await api.post("/boston-tv/screens", {
      tenantId: effectiveTenant,
      name: newScreenName.trim(),
      locationHint: newScreenLocation.trim() || undefined,
      playlistId: newScreenPlaylistId && newScreenPlaylistId !== "_none" ? newScreenPlaylistId : undefined,
      weeklySchedule: weekly,
    });
    setNewScreenOpen(false);
    setNewScreenName("");
    setNewScreenLocation("");
    setNewScreenPlaylistId("");
    await refresh();
  };

  const copyPlayUrl = (token: string) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    void navigator.clipboard.writeText(`${base}/tv/play/${token}`);
  };

  const deleteScreen = async (id: string) => {
    if (!confirm("Remover esta tela? O link do player deixará de funcionar.")) return;
    await api.delete(`/boston-tv/screens/${id}`);
    await refresh();
  };

  const assignIptvChannel = async (screenId: string, channelId: string) => {
    await api.patch(`/boston-tv/screens/${screenId}`, {
      displayMode: "iptv",
      iptvChannelId: channelId,
    });
    setAssignScreenId(null);
    await refresh();
  };

  const clearScreenIptv = async (screenId: string) => {
    await api.patch(`/boston-tv/screens/${screenId}`, {
      displayMode: "playlist",
      iptvChannelId: null,
    });
    await refresh();
  };

  const assignScreen = screens.find((s) => s.id === assignScreenId);

  const regenerate = async (id: string) => {
    if (!confirm("Gerar novo token? O link antigo na TV deixará de funcionar.")) return;
    await api.post(`/boston-tv/screens/${id}/regenerate-token`, {});
    await refresh();
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
      <div className="flex flex-wrap items-start justify-between gap-4">
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Empresa / clube</Label>
          <Select
            value={effectiveTenant || "_"}
            onValueChange={(v) => setTenantFilter(v === "_" ? "" : v)}
            disabled={tenants.length === 0}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {tenants.length === 0 ? (
                <SelectItem value="_">Carregando…</SelectItem>
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

      {effectiveTenant ? (
        <BostonTvIptvPanel
          tenantId={effectiveTenant}
          assignMode={Boolean(assignScreenId)}
          onAssignChannel={
            assignScreenId
              ? (ch) => void assignIptvChannel(assignScreenId, ch.id)
              : undefined
          }
          assignLabel={assignScreen ? `Canal em “${assignScreen.name}”` : "Usar na tela"}
        />
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Playlists</CardTitle>
            <CardDescription>Sequência de conteúdos exibidos em loop na tela</CardDescription>
          </div>
          <Button size="sm" onClick={() => setNewPlOpen(true)} disabled={!effectiveTenant}>
            <Plus className="mr-2 h-4 w-4" />
            Nova playlist
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : playlists.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma playlist nesta empresa.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border">
              {playlists.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {p._count?.items ?? 0} item(ns)
                  </span>
                  <Link href={`/dashboard/marketing/boston-tv/playlists/${p.id}`}>
                    <Button variant="outline" size="sm">
                      Editar itens
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Telas</CardTitle>
            <CardDescription>
              Cada tela tem um link único para abrir na TV. Use o mesmo ambiente (URL) que o dashboard.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setNewScreenOpen(true)} disabled={!effectiveTenant}>
            <Plus className="mr-2 h-4 w-4" />
            Nova tela
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : screens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tela cadastrada.</p>
          ) : (
            <ul className="space-y-3">
              {screens.map((s) => {
                const base = typeof window !== "undefined" ? window.location.origin : "";
                const url = `${base}/tv/play/${s.playerToken}`;
                return (
                  <li
                    key={s.id}
                    className="rounded-lg border border-border p-3 text-sm flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{s.name}</p>
                      {s.locationHint ? (
                        <p className="text-xs text-muted-foreground">{s.locationHint}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground mt-1 break-all">{url}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.displayMode === "iptv" && s.iptvChannel
                          ? `Canal IPTV: ${s.iptvChannel.name}`
                          : `Playlist: ${s.playlist?.name ?? "—"}`}{" "}
                        · Fuso: {s.scheduleTimezone}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => copyPlayUrl(s.playerToken)}>
                        <Clipboard className="mr-1 h-4 w-4" />
                        Copiar link
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignScreenId(s.id)}
                      >
                        <Tv className="mr-1 h-4 w-4" />
                        {s.displayMode === "iptv" ? "Trocar canal" : "Canal IPTV"}
                      </Button>
                      {s.displayMode === "iptv" ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => void clearScreenIptv(s.id)}>
                          Usar playlist
                        </Button>
                      ) : null}
                      <Button type="button" variant="outline" size="sm" onClick={() => regenerate(s.id)}>
                        <RefreshCw className="mr-1 h-4 w-4" />
                        Novo token
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteScreen(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {assignScreenId && assignScreen ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          Escolhendo canal IPTV para <strong>{assignScreen.name}</strong>. Busque abaixo e clique em{" "}
          <strong>{`Canal em “${assignScreen.name}”`}</strong>.
          <Button type="button" variant="link" className="ml-2 h-auto p-0" onClick={() => setAssignScreenId(null)}>
            Cancelar
          </Button>
        </div>
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
              placeholder="Ex.: Recepção — loop principal"
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

      <Dialog open={newScreenOpen} onOpenChange={setNewScreenOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova tela (TV)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="sc-name">Nome *</Label>
              <Input
                id="sc-name"
                value={newScreenName}
                onChange={(e) => setNewScreenName(e.target.value)}
                placeholder="Ex.: TV recepção"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-loc">Local (opcional)</Label>
              <Input
                id="sc-loc"
                value={newScreenLocation}
                onChange={(e) => setNewScreenLocation(e.target.value)}
                placeholder="Ex.: CT — auditório"
              />
            </div>
            <div className="space-y-2">
              <Label>Playlist inicial</Label>
              <Select value={newScreenPlaylistId || "_none"} onValueChange={setNewScreenPlaylistId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (configure depois)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhuma</SelectItem>
                  {playlists.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-sch">Agenda semanal (JSON, opcional)</Label>
              <Textarea
                id="sc-sch"
                rows={6}
                className="font-mono text-xs"
                value={newScreenScheduleJson}
                onChange={(e) => setNewScreenScheduleJson(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Vazio = conteúdo 24h. Com janelas = fora do horário a tela fica em blecaute. Dias: 1=seg …
                7=dom.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewScreenOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void createScreen()}>Criar tela</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
