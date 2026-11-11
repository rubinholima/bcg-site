"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HomeContentBlock, PatrocinadorItem } from "@/types/home-content";
import type { BlockConfigValue } from "@/types/block-config";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { getPublicImageUrl } from "@/lib/media-url";

export type SponsorTier = {
  id: string;
  name: string;
  sortOrder: number;
  sponsors: PatrocinadorItem[];
};

export function PatrocinadoresModuleEditor({
  block,
  updateBlockConfigValue,
}: {
  block: HomeContentBlock;
  updateBlockConfigValue: (key: string, value: BlockConfigValue) => void;
}) {
  const layout = (block.config?.patrocinadoresLayout as string) ?? "grid";
  const tiers = (block.config?.patrocinadoresTiers as SponsorTier[] | undefined) ?? [];
  const legacyItems = (block.config?.patrocinadoresManualItems as PatrocinadorItem[]) ?? [];

  const ensureTiers = (): SponsorTier[] => {
    if (tiers.length) return tiers;
    if (legacyItems.length) {
      return [{ id: "default", name: "Patrocinadores", sortOrder: 0, sponsors: legacyItems }];
    }
    return [{ id: "tier-1", name: "Principal", sortOrder: 0, sponsors: [] }];
  };

  const currentTiers = ensureTiers();

  const saveTiers = (next: SponsorTier[]) => {
    updateBlockConfigValue("patrocinadoresTiers", next);
    updateBlockConfigValue("patrocinadoresManualItems", next.flatMap((t) => t.sponsors));
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <details open className="rounded-lg border border-border bg-muted/20">
        <summary className="cursor-pointer px-3 py-2 font-medium">Patrocinadores</summary>
        <div className="space-y-3 border-t border-border px-3 py-3">
          <div className="space-y-1">
            <Label>Layout</Label>
            <Select value={layout} onValueChange={(v) => updateBlockConfigValue("patrocinadoresLayout", v)}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grade</SelectItem>
                <SelectItem value="tiered">Por níveis</SelectItem>
                <SelectItem value="carousel">Carrossel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <MediaPicker
            label="Logo do título (opcional)"
            sizeKey="patrocinadores"
            uploadFolderHint="patrocinadores"
            value={(block.config?.patrocinadoresTitleLogo as string) ?? ""}
            onChange={(url) => updateBlockConfigValue("patrocinadoresTitleLogo", url)}
          />
          {currentTiers.map((tier, ti) => (
            <div key={tier.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={tier.name}
                  onChange={(e) => {
                    const next = [...currentTiers];
                    next[ti] = { ...tier, name: e.target.value };
                    saveTiers(next);
                  }}
                  placeholder="Nome do nível"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => saveTiers(currentTiers.filter((_, i) => i !== ti))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {tier.sponsors.map((item, si) => (
                <SponsorRow
                  key={item.id ?? si}
                  item={item}
                  onChange={(patch) => {
                    const next = [...currentTiers];
                    const sponsors = [...tier.sponsors];
                    sponsors[si] = { ...sponsors[si], ...patch };
                    next[ti] = { ...tier, sponsors };
                    saveTiers(next);
                  }}
                  onRemove={() => {
                    const next = [...currentTiers];
                    next[ti] = { ...tier, sponsors: tier.sponsors.filter((_, i) => i !== si) };
                    saveTiers(next);
                  }}
                />
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const next = [...currentTiers];
                  next[ti] = {
                    ...tier,
                    sponsors: [...tier.sponsors, { id: `s-${Date.now()}`, name: "", logoUrl: "", link: "" }],
                  };
                  saveTiers(next);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Patrocinador
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              saveTiers([
                ...currentTiers,
                { id: `tier-${Date.now()}`, name: "Novo nível", sortOrder: currentTiers.length, sponsors: [] },
              ])
            }
          >
            Adicionar nível
          </Button>
        </div>
      </details>
    </div>
  );
}

function SponsorRow({
  item,
  onChange,
  onRemove,
}: {
  item: PatrocinadorItem;
  onChange: (patch: Partial<PatrocinadorItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2 rounded border border-border/60 p-2">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-muted">
        {item.logoUrl ? (
          <img src={getPublicImageUrl(item.logoUrl)} alt="" className="h-full w-full object-contain p-1" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <MediaPicker label="Logo" sizeKey="patrocinadores" value={item.logoUrl ?? ""} onChange={(url) => onChange({ logoUrl: url })} />
        <Input placeholder="Nome" value={item.name ?? ""} onChange={(e) => onChange({ name: e.target.value })} />
        <Input placeholder="Link" value={item.link ?? ""} onChange={(e) => onChange({ link: e.target.value })} />
      </div>
      <Button type="button" size="icon" variant="ghost" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
