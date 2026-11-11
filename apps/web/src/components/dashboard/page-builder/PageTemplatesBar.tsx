"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FOOTBALL_TEMPLATE_LABELS,
  buildFootballPageTemplate,
  type FootballPageTemplateId,
} from "@/lib/page-builder/football-page-templates";
import type { HomeContentBlock } from "@/types/home-content";

export function PageTemplatesBar({
  onApply,
}: {
  onApply: (blocks: HomeContentBlock[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/5 px-3 py-2">
      <span className="text-xs font-semibold text-violet-300">Template</span>
      <Select
        onValueChange={(v) => onApply(buildFootballPageTemplate(v as FootballPageTemplateId))}
      >
        <SelectTrigger className="h-10 min-w-[200px]">
          <SelectValue placeholder="Inserir template…" />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(FOOTBALL_TEMPLATE_LABELS) as FootballPageTemplateId[]).map((id) => (
            <SelectItem key={id} value={id}>
              {FOOTBALL_TEMPLATE_LABELS[id]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
