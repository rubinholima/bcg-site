"use client";

import { ChevronDown, ChevronUp, Copy, GripVertical, Layers, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HomeContentBlock, HomeBlockType } from "@/types/home-content";
import { getBlockLabel } from "@/lib/home-content";

export function PageBuilderNavigator({
  blocks,
  selectedBlockId,
  collapsedBlockIds,
  lang = "pt",
  onSelect,
  onToggleCollapse,
  onMove,
  onDuplicate,
  onCopy,
  onRemove,
}: {
  blocks: HomeContentBlock[];
  selectedBlockId: string | null;
  collapsedBlockIds: Set<string>;
  lang?: "pt" | "en";
  onSelect: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onMove: (from: number, dir: -1 | 1) => void;
  onDuplicate: (index: number) => void;
  onCopy: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-2">
      <ServerCollaborationHeader />
      <ul className="max-h-[min(70vh,640px)] space-y-1 overflow-y-auto">
        {blocks.map((block, index) => {
          const label = getBlockLabel(block.id, block.type as HomeBlockType, lang);
          const selected = selectedBlockId === block.id;
          const canMove = index > 0 && index < blocks.length - 1;
          return (
            <li
              key={block.id}
              className={`rounded-md border px-2 py-1.5 ${selected ? "border-violet-500/50 bg-violet-500/10" : "border-transparent bg-muted/30"}`}
            >
              <button type="button" className="flex w-full items-center gap-2 text-left text-sm" onClick={() => onSelect(block.id)}>
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{label}</span>
              </button>
              <div className="mt-1 flex flex-wrap gap-1">
                {canMove ? (
                  <>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => onMove(index, -1)}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => onMove(index, 1)}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDuplicate(index)} title="Duplicar">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => onCopy(index)} title="Copiar">
                  <Copy className="h-4 w-4 opacity-60" />
                </Button>
                {canMove ? (
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onRemove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => onToggleCollapse(block.id)}>
                  {collapsedBlockIds.has(block.id) ? "Expandir" : "Recolher"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ServerCollaborationHeader() {
  return (
    <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <Layers className="h-4 w-4" />
      Camadas
    </div>
  );
}
