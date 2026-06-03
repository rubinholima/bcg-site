"use client";

import type { HomeContentBlock } from "@/types/home-content";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface HeroMainTitlePanelProps {
  block: HomeContentBlock;
  index: number;
  updateBlockConfig: (index: number, key: string, value: string | undefined) => void;
}

/** Título grande do banner Hero (`config.titlePt` / `titleEn`) — distinto do título por slide. */
export function HeroMainTitlePanel({ block, index, updateBlockConfig }: HeroMainTitlePanelProps) {
  return (
    <details className="rounded-lg border border-violet-500/30 bg-violet-500/5 sm:col-span-2">
      <summary className="cursor-pointer px-3 py-2.5 font-medium text-violet-200">
        Título principal do Hero
      </summary>
      <div className="space-y-3 border-t border-violet-500/20 px-3 py-3">
        <p className="text-xs text-muted-foreground">
          Frase grande sobre o banner (ex.: &quot;Um Clube, várias emoções&quot;). Deixe vazio para não exibir título.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Título (PT)</Label>
            <Input
              placeholder="Título em português"
              value={(block.config?.titlePt as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "titlePt", e.target.value)}
              className="text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label>Título (EN)</Label>
            <Input
              placeholder="Title in English"
              value={(block.config?.titleEn as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "titleEn", e.target.value)}
              className="text-foreground"
            />
          </div>
        </div>
      </div>
    </details>
  );
}
