"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { FeedbackModal } from "@/components/ui/feedback-modal";

export type ClipCollectionItemRow = {
  id: string;
  groupKey: string;
  sortOrder: number;
  clipId: string;
  clip: { id: string; title: string };
};

type Props = {
  collectionId: string;
  groupKey: string;
  groupLabel: string;
  items: ClipCollectionItemRow[];
  onChanged: () => void | Promise<void>;
  onPreview: (clipId: string) => void;
  onRemove: (itemId: string) => void;
};

function sortItems(rows: ClipCollectionItemRow[]) {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function reindexSortOrder(rows: ClipCollectionItemRow[]): ClipCollectionItemRow[] {
  return rows.map((r, i) => ({ ...r, sortOrder: i }));
}

export function ClipCollectionReorderList({
  collectionId,
  groupKey,
  groupLabel,
  items,
  onChanged,
  onPreview,
  onRemove,
}: Props) {
  const [local, setLocal] = useState(() => sortItems(items));
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const snapshot = useRef(local);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    setLocal(sortItems(items));
  }, [items]);

  const persist = useCallback(
    async (next: ClipCollectionItemRow[], rollback: ClipCollectionItemRow[]) => {
      setSaving(true);
      snapshot.current = next;
      try {
        await api.post(`/performance-analysis/clip-collections/${collectionId}/reorder`, {
          items: next.map((r) => ({ id: r.id, groupKey: r.groupKey, sortOrder: r.sortOrder })),
        });
        await onChanged();
      } catch (e) {
        setLocal(rollback);
        setFeedback({
          title: "Ordem não salva",
          message: e instanceof Error ? e.message : "Tente novamente.",
        });
      } finally {
        setSaving(false);
      }
    },
    [collectionId, onChanged],
  );

  const move = (itemId: string, dir: -1 | 1) => {
    const sorted = sortItems(local);
    const idx = sorted.findIndex((r) => r.id === itemId);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= sorted.length) return;
    const rollback = [...sorted];
    const copy = [...sorted];
    const [row] = copy.splice(idx, 1);
    copy.splice(target, 0, row);
    const reindexed = reindexSortOrder(copy);
    setLocal(reindexed);
    void persist(reindexed, rollback);
  };

  const onDropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const sorted = sortItems(local);
    const from = sorted.findIndex((r) => r.id === dragId);
    const to = sorted.findIndex((r) => r.id === targetId);
    if (from < 0 || to < 0) return;
    const rollback = [...sorted];
    const copy = [...sorted];
    const [row] = copy.splice(from, 1);
    copy.splice(to, 0, row);
    const reindexed = reindexSortOrder(copy);
    setLocal(reindexed);
    setDragId(null);
    void persist(reindexed, rollback);
  };

  const sorted = sortItems(local);
  if (sorted.length === 0) return null;

  return (
    <div className="relative">
      {saving ? (
        <Loader2 className="absolute right-0 top-0 h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
      ) : null}
      <p className="text-xs font-medium text-muted-foreground">{groupLabel}</p>
      <ul className="text-sm" role="list">
        {sorted.map((it, index) => (
          <li
            key={it.id}
            draggable
            onDragStart={() => setDragId(it.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropOn(it.id)}
            className={cn(
              "flex items-center gap-1 rounded py-0.5 pr-1",
              dragId === it.id && "bg-violet-500/10 ring-1 ring-violet-500/30",
            )}
          >
            <span className="cursor-grab text-muted-foreground" aria-hidden>
              <GripVertical className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 truncate">{it.clip.title}</span>
            <div className="flex shrink-0 gap-0.5">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={index === 0 || saving}
                aria-label="Mover para cima"
                onClick={() => move(it.id, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={index === sorted.length - 1 || saving}
                aria-label="Mover para baixo"
                onClick={() => move(it.id, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => onPreview(it.clipId)}>
                Preview
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => onRemove(it.id)}>
                Remover
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <FeedbackModal
        open={!!feedback}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        variant="error"
      />
    </div>
  );
}
