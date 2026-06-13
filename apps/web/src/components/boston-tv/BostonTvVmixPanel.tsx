"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Radio, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export type VmixChannelOption = {
  id: string;
  name: string;
  streamUrl: string;
  sortOrder: number;
  enabled: boolean;
  playable?: boolean;
};

interface BostonTvVmixPanelProps {
  tenantId: string;
  embedded?: boolean;
}

export function formatVmixChannelLabel(ch: Pick<VmixChannelOption, "name">): string {
  return ch.name.trim() || "Fonte vMix";
}

export function BostonTvVmixPanel({ tenantId, embedded = false }: BostonTvVmixPanelProps) {
  const [channels, setChannels] = useState<VmixChannelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("vMix — Canal 1");
  const [newUrl, setNewUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data } = await api.get<{ items: VmixChannelOption[] }>(
        `/boston-tv/vmix/channels?tenantId=${encodeURIComponent(tenantId)}`,
      );
      setChannels(data?.items ?? []);
    } catch {
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveChannel = async (ch: VmixChannelOption, patch: Partial<VmixChannelOption>) => {
    setSavingId(ch.id);
    try {
      await api.patch(`/boston-tv/vmix/channels/${ch.id}`, {
        name: patch.name ?? ch.name,
        streamUrl: patch.streamUrl ?? ch.streamUrl,
        enabled: patch.enabled ?? ch.enabled,
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao salvar fonte vMix");
    } finally {
      setSavingId(null);
    }
  };

  const createChannel = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setCreating(true);
    try {
      await api.post("/boston-tv/vmix/channels", {
        tenantId,
        name: newName.trim(),
        streamUrl: newUrl.trim(),
      });
      setNewUrl("");
      setNewName(`vMix — Canal ${channels.length + 2}`);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao criar fonte vMix");
    } finally {
      setCreating(false);
    }
  };

  const removeChannel = async (id: string) => {
    if (!confirm("Remover esta fonte vMix? Itens de playlist que a usam deixam de tocar.")) return;
    try {
      await api.delete(`/boston-tv/vmix/channels/${id}`);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  const body = (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Cadastre aqui as saídas do <strong className="text-foreground">vMix</strong> (HLS ou MPEG-TS).
        Depois, nas playlists, escolha o tipo <strong className="text-foreground">Fonte vMix</strong>.
        Não usa Birddog/NDI na TV — o sinal vem da URL que o vMix publica na rede.
      </p>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando fontes…
        </p>
      ) : null}

      {channels.map((ch) => (
        <div
          key={ch.id}
          className="rounded-lg border border-border bg-card/50 p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-amber-500" />
              {formatVmixChannelLabel(ch)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => void removeChannel(ch.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                defaultValue={ch.name}
                className="text-foreground"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== ch.name) void saveChannel(ch, { name: v });
                }}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>URL do stream (vMix Output)</Label>
              <Input
                defaultValue={ch.streamUrl}
                placeholder="http://IP-DO-VMIX:8088/hls/stream.m3u8"
                className="text-foreground font-mono text-sm"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== ch.streamUrl) void saveChannel(ch, { streamUrl: v });
                }}
              />
              {ch.playable === false ? (
                <p className="text-xs text-amber-500">URL não parece stream HLS/TS válido.</p>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={savingId === ch.id}
            onClick={() => void saveChannel(ch, {})}
          >
            {savingId === ch.id ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      ))}

      {channels.length < 8 ? (
        <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Nova fonte vMix</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-foreground"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>URL HLS / TS do vMix</Label>
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="http://192.168.x.x:8088/hls/stream.m3u8"
                className="text-foreground font-mono text-sm"
              />
            </div>
          </div>
          <Button type="button" onClick={() => void createChannel()} disabled={creating}>
            {creating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Adicionar fonte
          </Button>
        </div>
      ) : null}
    </div>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fontes vMix</CardTitle>
        <CardDescription>Saídas ao vivo do vMix para usar nas playlists (sem Birddog).</CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
