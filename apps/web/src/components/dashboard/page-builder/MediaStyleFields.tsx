"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BlockConfigValue } from "@/types/block-config";

export function MediaStyleFields({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: BlockConfigValue) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs">Texto alternativo (imagem)</Label>
        <Input
          value={(config.mediaAlt as string) ?? ""}
          onChange={(e) => onChange("mediaAlt", e.target.value)}
          placeholder="Descrição para acessibilidade"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Proporção</Label>
        <Select
          value={(config.mediaAspectRatio as string) ?? "inherit"}
          onValueChange={(v) => onChange("mediaAspectRatio", v === "inherit" ? undefined : v)}
        >
          <SelectTrigger className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">Padrão</SelectItem>
            <SelectItem value="16/9">16:9</SelectItem>
            <SelectItem value="4/3">4:3</SelectItem>
            <SelectItem value="1/1">1:1</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Object fit</Label>
        <Select
          value={(config.mediaObjectFit as string) ?? "cover"}
          onValueChange={(v) => onChange("mediaObjectFit", v)}
        >
          <SelectTrigger className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs">Posição / foco</Label>
        <Input
          value={(config.mediaObjectPosition as string) ?? ""}
          onChange={(e) => onChange("mediaObjectPosition", e.target.value || undefined)}
          placeholder="center, top, 50% 20%…"
        />
      </div>
    </div>
  );
}
