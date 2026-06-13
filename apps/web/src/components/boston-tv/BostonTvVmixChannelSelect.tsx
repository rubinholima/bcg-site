"use client";

import { useCallback, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { ModalNativeSelect } from "@/components/ui/modal-native-select";
import { api } from "@/lib/api";
import {
  formatVmixChannelLabel,
  type VmixChannelOption,
} from "@/components/boston-tv/BostonTvVmixPanel";

interface BostonTvVmixChannelSelectProps {
  tenantId: string;
  value: string;
  onChange: (channelId: string) => void;
}

export function BostonTvVmixChannelSelect({
  tenantId,
  value,
  onChange,
}: BostonTvVmixChannelSelectProps) {
  const [channels, setChannels] = useState<VmixChannelOption[]>([]);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data } = await api.get<{ items: VmixChannelOption[] }>(
        `/boston-tv/vmix/channels?tenantId=${encodeURIComponent(tenantId)}&enabledOnly=1`,
      );
      setChannels(data?.items ?? []);
    } catch {
      setChannels([]);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (channels.length === 0) {
    return (
      <p className="text-sm text-amber-500">
        Nenhuma fonte vMix cadastrada. Configure em Boston TV → Fontes vMix.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Fonte vMix</Label>
      <ModalNativeSelect
        value={value}
        onChange={onChange}
        options={channels.map((ch) => ({
          value: ch.id,
          label: formatVmixChannelLabel(ch),
        }))}
        placeholder="Escolha o canal do vMix"
      />
    </div>
  );
}
