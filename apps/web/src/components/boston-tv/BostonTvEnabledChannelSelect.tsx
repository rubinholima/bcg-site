"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

export type IptvChannelOption = {
  id: string;
  name: string;
  groupTitle: string | null;
};

export function formatIptvChannelLabel(ch: Pick<IptvChannelOption, "name" | "groupTitle">): string {
  return ch.groupTitle ? `${ch.name} — ${ch.groupTitle}` : ch.name;
}

interface BostonTvEnabledChannelSelectProps {
  tenantId: string;
  value: string;
  onChange: (channelId: string) => void;
  /** Canal já salvo (edição) — garante nome legível mesmo fora da lista carregada */
  fallbackChannel?: IptvChannelOption | null;
  id?: string;
}

export function BostonTvEnabledChannelSelect({
  tenantId,
  value,
  onChange,
  fallbackChannel,
  id = "iptv-channel",
}: BostonTvEnabledChannelSelectProps) {
  const [channels, setChannels] = useState<IptvChannelOption[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data } = await api.get<{ items: IptvChannelOption[]; total: number }>(
        `/boston-tv/iptv/channels?tenantId=${encodeURIComponent(tenantId)}&enabledOnly=1&limit=200`,
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

  const options = useMemo(() => {
    const list = [...channels];
    if (
      fallbackChannel &&
      value === fallbackChannel.id &&
      !list.some((c) => c.id === fallbackChannel.id)
    ) {
      list.unshift(fallbackChannel);
    }
    return list;
  }, [channels, fallbackChannel, value]);

  const selectValue = value && options.some((c) => c.id === value) ? value : "_none";

  if (loading && options.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando canais liberados…
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-amber-500/90 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
        Nenhum canal liberado ainda. Sincronize a lista M3U abaixo e clique em <strong>Liberar</strong> nos
        canais desejados.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Canal IPTV *</Label>
      <Select value={selectValue} onValueChange={(v) => onChange(v === "_none" ? "" : v)}>
        <SelectTrigger id={id} className="text-foreground">
          <SelectValue placeholder="Escolha o canal" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="_none">Selecione…</SelectItem>
          {options.map((ch) => (
            <SelectItem key={ch.id} value={ch.id}>
              {formatIptvChannelLabel(ch)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
