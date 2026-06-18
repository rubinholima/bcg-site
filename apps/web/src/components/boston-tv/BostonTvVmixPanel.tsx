"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Radio, Save, Trash2 } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalNativeSelect } from "@/components/ui/modal-native-select";
import { api } from "@/lib/api";
import { normalizeVmixStreamUrl } from "@/lib/vmix-stream-url";

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

type FeedbackState = {
  title: string;
  message: string;
  variant: "error" | "success" | "warning" | "info";
};

export function formatVmixChannelLabel(ch: Pick<VmixChannelOption, "name" | "deliveryType">): string {
  const base = ch.name.trim() || "Fonte vMix";
  return ch.deliveryType === "ndi" ? `${base} (NDI)` : base;
}

export function BostonTvVmixPanel({ tenantId, embedded = false }: BostonTvVmixPanelProps) {
  const [channels, setChannels] = useState<VmixChannelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const [newName, setNewName] = useState("vMix — Canal 1");
  const [newDelivery, setNewDelivery] = useState<"stream" | "ndi">("ndi");
  const [newUrl, setNewUrl] = useState("");
  const [newNdiName, setNewNdiName] = useState("vMix - Output 1");
  const [creating, setCreating] = useState(false);

  const showError = (message: string, title = "Erro") => {
    setFeedback({ title, message, variant: "error" });
  };

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
      const deliveryType = patch.deliveryType ?? ch.deliveryType ?? "stream";
      const streamUrl =
        deliveryType === "stream"
          ? normalizeVmixStreamUrl(patch.streamUrl ?? ch.streamUrl)
          : "";
      await api.patch(`/boston-tv/vmix/channels/${ch.id}`, {
        name: patch.name ?? ch.name,
        deliveryType,
        streamUrl,
        ndiSourceName:
          deliveryType === "ndi"
            ? (patch.ndiSourceName ?? ch.ndiSourceName ?? "").trim() || null
            : null,
        enabled: patch.enabled ?? ch.enabled,
      });
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Erro ao salvar fonte vMix");
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
        streamUrl:
          newDelivery === "stream" ? normalizeVmixStreamUrl(newUrl) : "",
        ndiSourceName: newDelivery === "ndi" ? newNdiName.trim() : undefined,
      });
      setNewUrl("");
      setNewNdiName("vMix - Output 2");
      setNewName(`vMix — Canal ${channels.length + 2}`);
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Erro ao criar fonte vMix");
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/boston-tv/vmix/channels/${deleteId}`);
      setDeleteId(null);
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Erro ao remover");
    } finally {
      setDeleting(false);
    }
  };

  const deliveryOptions = [
    { value: "ndi", label: "NDI — baixa latência (app BCG TV)" },
    { value: "stream", label: "Stream HTTP — HLS / MPEG-TS (LiveLAN)" },
  ];

  const body = (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Cadastre as saídas do <strong className="text-foreground">vMix</strong>. Para evento ao vivo com
        latência mínima, use <strong className="text-foreground">NDI</strong> (mesmo nome que aparece no
        NDI Studio Monitor, ex.: <code className="text-foreground">vMix - Output 1</code>). Para{" "}
        <strong className="text-foreground">navegador na TV</strong> (LG, etc.), use{" "}
        <strong className="text-foreground">Stream HTTP</strong> com LiveLAN — ex.:{" "}
        <code className="text-foreground">http://10.0.0.2:8088/livelan</code> (o sistema completa com{" "}
        <code className="text-foreground">/stream.m3u8</code>).
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
              onClick={() => setDeleteId(ch.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <ChannelEditor ch={ch} saving={savingId === ch.id} onSave={saveChannel} deliveryOptions={deliveryOptions} />
        </div>
      ))}

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
                <Label>URL LiveLAN / HLS do vMix</Label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="http://10.0.0.2:8088/livelan"
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

      <FeedbackModal
        open={feedback !== null}
        onOpenChange={(open) => !open && setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        variant={feedback?.variant ?? "error"}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover fonte vMix?</AlertDialogTitle>
            <AlertDialogDescription>
              Itens de playlist que usam esta fonte deixam de tocar até você escolher outra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      streamUrl: delivery === "stream" ? normalizeVmixStreamUrl(streamUrl) : "",
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
            <Label>URL do stream (vMix LiveLAN / HLS)</Label>
            <Input
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="http://10.0.0.2:8088/livelan"
              className="text-foreground font-mono text-sm"
            />
            {ch.playable === false ? (
              <p className="text-xs text-amber-500">
                URL inválida ou LiveLAN sem stream ativo no vMix. Use o IP do PC do vMix e confira se Stream está
                vermelho.
              </p>
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
