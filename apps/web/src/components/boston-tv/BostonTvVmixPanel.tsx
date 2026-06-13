"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Radio, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalNativeSelect } from "@/components/ui/modal-native-select";
import { api } from "@/lib/api";

export type VmixChannelOption = {
  id: string;
  name: string;
  deliveryType?: "stream" | "ndi";
  streamUrl: string;
  ndiSourceName?: string | null;
  sortOrder: number;
  enabled: boolean;
  playable?: boolean;
};

interface BostonTvVmixPanelProps {
  tenantId: string;
  embedded?: boolean;
}

export function formatVmixChannelLabel(ch: Pick<VmixChannelOption, "name" | "deliveryType">): string {
  const base = ch.name.trim() || "Fonte vMix";
  return ch.deliveryType === "ndi" ? `${base} (NDI)` : base;
}

export function BostonTvVmixPanel({ tenantId, embedded = false }: BostonTvVmixPanelProps) {
  const [channels, setChannels] = useState<VmixChannelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("vMix — Canal 1");
  const [newDelivery, setNewDelivery] = useState<"stream" | "ndi">("ndi");
  const [newUrl, setNewUrl] = useState("");
  const [newNdiName, setNewNdiName] = useState("vMix - Output 1");
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
        deliveryType: patch.deliveryType ?? ch.deliveryType ?? "stream",
        streamUrl: patch.streamUrl ?? ch.streamUrl,
        ndiSourceName: patch.ndiSourceName ?? ch.ndiSourceName,
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
    if (!newName.trim()) return;
    if (newDelivery === "ndi" && !newNdiName.trim()) return;
    if (newDelivery === "stream" && !newUrl.trim()) return;
    setCreating(true);
    try {
      await api.post("/boston-tv/vmix/channels", {
        tenantId,
        name: newName.trim(),
        deliveryType: newDelivery,
        streamUrl: newDelivery === "stream" ? newUrl.trim() : "",
        ndiSourceName: newDelivery === "ndi" ? newNdiName.trim() : undefined,
      });
      setNewUrl("");
      setNewNdiName("vMix - Output 2");
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

  const deliveryOptions = [
    { value: "ndi", label: "NDI — baixa latência (app BCG TV)" },
    { value: "stream", label: "Stream HTTP — HLS / MPEG-TS" },
  ];

  const body = (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Cadastre as saídas do <strong className="text-foreground">vMix</strong>. Para evento ao vivo com
        latência mínima, use <strong className="text-foreground">NDI</strong> (mesmo nome que aparece no
        NDI Studio Monitor, ex.: <code className="text-foreground">vMix - Output 1</code>). Nas playlists,
        escolha <strong className="text-foreground">Fonte vMix</strong> — o app BCG TV na TV recebe o NDI
        direto.
      </p>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando fontes…
        </p>
      ) : null}

      {channels.map((ch) => {
        const isNdi = ch.deliveryType === "ndi";
        return (
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
            <ChannelEditor ch={ch} saving={savingId === ch.id} onSave={saveChannel} deliveryOptions={deliveryOptions} />
          </div>
        );
      })}

      {channels.length < 8 ? (
        <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Nova fonte vMix</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome (rótulo no dashboard)</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-foreground"
              />
            </div>
            <div className="space-y-1">
              <Label>Entrega</Label>
              <ModalNativeSelect
                value={newDelivery}
                onChange={(v) => setNewDelivery(v as "stream" | "ndi")}
                options={deliveryOptions}
              />
            </div>
            {newDelivery === "ndi" ? (
              <div className="space-y-1 sm:col-span-2">
                <Label>Nome da fonte NDI</Label>
                <Input
                  value={newNdiName}
                  onChange={(e) => setNewNdiName(e.target.value)}
                  placeholder="vMix - Output 1"
                  className="text-foreground font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Igual ao que aparece no NDI Studio Monitor (ex.: BOSTONCITYFC → vMix - Output 1).
                </p>
              </div>
            ) : (
              <div className="space-y-1 sm:col-span-2">
                <Label>URL HLS / TS do vMix</Label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="http://192.168.x.x:8088/hls/stream.m3u8"
                  className="text-foreground font-mono text-sm"
                />
              </div>
            )}
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
        <CardDescription>NDI ou stream HTTP — para playlists e app BCG TV nas Smart TVs.</CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

function ChannelEditor({
  ch,
  saving,
  onSave,
  deliveryOptions,
}: {
  ch: VmixChannelOption;
  saving: boolean;
  onSave: (ch: VmixChannelOption, patch: Partial<VmixChannelOption>) => Promise<void>;
  deliveryOptions: { value: string; label: string }[];
}) {
  const [delivery, setDelivery] = useState<"stream" | "ndi">(ch.deliveryType === "ndi" ? "ndi" : "stream");
  const [name, setName] = useState(ch.name);
  const [streamUrl, setStreamUrl] = useState(ch.streamUrl);
  const [ndiName, setNdiName] = useState(ch.ndiSourceName ?? "");

  useEffect(() => {
    setDelivery(ch.deliveryType === "ndi" ? "ndi" : "stream");
    setName(ch.name);
    setStreamUrl(ch.streamUrl);
    setNdiName(ch.ndiSourceName ?? "");
  }, [ch]);

  const handleSave = () => {
    void onSave(ch, {
      name: name.trim(),
      deliveryType: delivery,
      streamUrl: delivery === "stream" ? streamUrl.trim() : "",
      ndiSourceName: delivery === "ndi" ? ndiName.trim() : null,
    });
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="text-foreground" />
        </div>
        <div className="space-y-1">
          <Label>Entrega</Label>
          <ModalNativeSelect
            value={delivery}
            onChange={(v) => setDelivery(v as "stream" | "ndi")}
            options={deliveryOptions}
          />
        </div>
        {delivery === "ndi" ? (
          <div className="space-y-1 sm:col-span-2">
            <Label>Nome da fonte NDI</Label>
            <Input
              value={ndiName}
              onChange={(e) => setNdiName(e.target.value)}
              placeholder="vMix - Output 1"
              className="text-foreground font-mono text-sm"
            />
            {ch.playable === false ? (
              <p className="text-xs text-amber-500">Informe o nome NDI exatamente como no Studio Monitor.</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1 sm:col-span-2">
            <Label>URL do stream (vMix Output)</Label>
            <Input
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="http://IP-DO-VMIX:8088/hls/stream.m3u8"
              className="text-foreground font-mono text-sm"
            />
            {ch.playable === false ? (
              <p className="text-xs text-amber-500">URL não parece stream HLS/TS válido.</p>
            ) : null}
          </div>
        )}
      </div>
      <Button type="button" size="sm" variant="outline" disabled={saving} onClick={handleSave}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar
      </Button>
    </>
  );
}
