"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Radio, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

type IptvSource = {
  id: string;
  name: string;
  playlistUrl: string;
  channelCount: number;
  syncStatus: string;
  syncError: string | null;
  lastSyncedAt: string | null;
};

type IptvChannel = {
  id: string;
  name: string;
  groupTitle: string | null;
  logoUrl: string | null;
  streamUrl: string;
  enabledForSelection?: boolean;
};

interface BostonTvIptvPanelProps {
  tenantId: string;
}

export function BostonTvIptvPanel({ tenantId }: BostonTvIptvPanelProps) {
  const [source, setSource] = useState<IptvSource | null>(null);
  const [enabledCount, setEnabledCount] = useState(0);
  const [playlistUrl, setPlaylistUrl] = useState("https://tinyurl.com/5xzmnjkn");
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [channels, setChannels] = useState<IptvChannel[]>([]);
  const [enabledChannels, setEnabledChannels] = useState<IptvChannel[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadSource = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data } = await api.get<IptvSource | null>(
        `/boston-tv/iptv/source?tenantId=${encodeURIComponent(tenantId)}`,
      );
      setSource(data ?? null);
      if (data?.playlistUrl) setPlaylistUrl(data.playlistUrl);
    } catch {
      setSource(null);
    }
  }, [tenantId]);

  const loadEnabledChannels = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data } = await api.get<{
        items: IptvChannel[];
        total: number;
        source: { enabledCount?: number } | null;
      }>(
        `/boston-tv/iptv/channels?tenantId=${encodeURIComponent(tenantId)}&enabledOnly=1&limit=100`,
      );
      setEnabledChannels(data?.items ?? []);
      setEnabledCount(data?.source?.enabledCount ?? data?.total ?? 0);
    } catch {
      setEnabledChannels([]);
      setEnabledCount(0);
    }
  }, [tenantId]);

  const searchChannels = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        limit: "50",
      });
      if (searchQ) params.set("q", searchQ);

      const { data } = await api.get<{
        source: { syncStatus: string; channelCount: number; enabledCount?: number } | null;
        items: IptvChannel[];
        total: number;
      }>(`/boston-tv/iptv/channels?${params.toString()}`);
      setChannels(data?.items ?? []);
      setTotal(data?.total ?? 0);
      if (data?.source?.enabledCount != null) setEnabledCount(data.source.enabledCount);
    } catch {
      setChannels([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tenantId, searchQ]);

  useEffect(() => {
    void loadSource();
  }, [loadSource]);

  useEffect(() => {
    if (source?.syncStatus === "syncing") {
      const t = window.setInterval(() => void loadSource(), 5000);
      return () => window.clearInterval(t);
    }
    return undefined;
  }, [source?.syncStatus, loadSource]);

  useEffect(() => {
    if (source?.syncStatus === "done" && source.channelCount > 0) {
      void loadEnabledChannels();
    }
  }, [source?.syncStatus, source?.channelCount, loadEnabledChannels]);

  useEffect(() => {
    if (source?.syncStatus === "done" && searchQ) {
      void searchChannels();
    }
  }, [source?.syncStatus, searchQ, searchChannels]);

  const saveSource = async () => {
    if (!tenantId || !playlistUrl.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post<IptvSource>("/boston-tv/iptv/source", {
        tenantId,
        playlistUrl: playlistUrl.trim(),
        name: "IPTV Boston City Hall",
      });
      setSource(data);
    } finally {
      setSaving(false);
    }
  };

  const sync = async () => {
    if (!tenantId) return;
    setSyncing(true);
    try {
      await api.post(`/boston-tv/iptv/sync?tenantId=${encodeURIComponent(tenantId)}`);
      await loadSource();
    } finally {
      setSyncing(false);
    }
  };

  const toggleEnabled = async (channel: IptvChannel, enabled: boolean) => {
    await api.patch(`/boston-tv/iptv/channels/${channel.id}/enabled`, { enabled });
    await loadEnabledChannels();
    if (searchQ) await searchChannels();
  };

  const statusLabel =
    source?.syncStatus === "syncing"
      ? "Sincronizando canais… (pode levar alguns minutos)"
      : source?.syncStatus === "done"
        ? `${source.channelCount.toLocaleString("pt-BR")} canais importados · ${enabledCount.toLocaleString("pt-BR")} liberados`
        : source?.syncStatus === "error"
          ? `Erro: ${source.syncError ?? "falha na sync"}`
          : "Lista ainda não sincronizada";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          IPTV (lista M3U)
        </CardTitle>
        <CardDescription>
          Sincronize a lista M3U, busque canais e clique em <strong>Liberar</strong>. Só os liberados aparecem ao criar/editar uma tela.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="iptv-url">URL da playlist M3U</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="iptv-url"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="https://..."
                className="text-foreground flex-1"
              />
              <Button type="button" variant="outline" onClick={() => void saveSource()} disabled={saving || !tenantId}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar URL"}
              </Button>
              <Button
                type="button"
                onClick={() => void sync()}
                disabled={syncing || !source || source.syncStatus === "syncing"}
              >
                {syncing || source?.syncStatus === "syncing" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sincronizar canais
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{statusLabel}</p>
            {source?.lastSyncedAt ? (
              <p className="text-xs text-muted-foreground">
                Última sync: {new Date(source.lastSyncedAt).toLocaleString("pt-BR")}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Usuário e senha já vêm dentro da lista M3U — não precisa cadastrar separado.
            </p>
          </div>

        {source?.syncStatus === "done" && source.channelCount > 0 ? (
          <>
            {enabledChannels.length > 0 ? (
              <div className="space-y-2 border-t border-border pt-4">
                <Label>Canais liberados ({enabledCount})</Label>
                <p className="text-xs text-muted-foreground">
                  Só estes aparecem na hora de escolher canal para cada TV.
                </p>
                <ul className="max-h-48 overflow-y-auto divide-y divide-border rounded-md border">
                  {enabledChannels.map((ch) => (
                    <li
                      key={ch.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{ch.name}</p>
                        {ch.groupTitle ? (
                          <p className="text-xs text-muted-foreground truncate">{ch.groupTitle}</p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive shrink-0"
                        onClick={() => void toggleEnabled(ch, false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="iptv-q">Buscar na lista completa</Label>
                  <Input
                    id="iptv-q"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSearchQ(q.trim());
                    }}
                    placeholder="Ex.: ESPN, Globo, SporTV…"
                    className="text-foreground"
                  />
                </div>
                <Button type="button" variant="secondary" onClick={() => setSearchQ(q.trim())}>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </Button>
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground">Buscando…</p>
              ) : channels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {searchQ ? "Nenhum canal encontrado." : "Digite um nome e clique em Buscar para liberar canais."}
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {total.toLocaleString("pt-BR")} resultado(s)
                    {searchQ ? ` para “${searchQ}”` : ""}
                  </p>
                  <ul className="max-h-80 overflow-y-auto divide-y divide-border rounded-md border">
                    {channels.map((ch) => (
                      <li
                        key={ch.id}
                        className="flex flex-col gap-2 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{ch.name}</p>
                          {ch.groupTitle ? (
                            <p className="text-xs text-muted-foreground truncate">{ch.groupTitle}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          {!ch.enabledForSelection ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => void toggleEnabled(ch, true)}
                            >
                              <Check className="mr-1 h-4 w-4" />
                              Liberar
                            </Button>
                          ) : (
                            <span className="text-xs text-emerald-500 self-center px-2">Liberado</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
