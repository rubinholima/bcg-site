"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import type { CoachPromotionCandidate } from "@/lib/treinadores-types";
import { CoachTeamReportPlayerAvatar } from "./CoachTeamReportPlayerAvatar";

export type PromotionSelection = {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  category: string | null;
  categoryLabel: string | null;
  photoUrl: string | null;
  reason: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorySelected: boolean;
  candidates: CoachPromotionCandidate[];
  loading: boolean;
  loadError: string | null;
  selections: PromotionSelection[];
  readOnly: boolean;
  onAdd: (candidate: CoachPromotionCandidate) => void;
  onRemove: (playerId: string) => void;
  onReasonChange: (playerId: string, reason: string) => void;
}

export function CoachTeamReportPromotionPicker({
  open,
  onOpenChange,
  categorySelected,
  candidates,
  loading,
  loadError,
  selections,
  readOnly,
  onAdd,
  onRemove,
  onReasonChange,
}: Props) {
  const { categories } = useFixtureCategories();
  const [search, setSearch] = useState("");

  const selectedIds = useMemo(() => new Set(selections.map((s) => s.playerId)), [selections]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (selectedIds.has(c.id)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.categoryLabel ?? c.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [candidates, search, selectedIds]);

  const emptyMessage = !categorySelected
    ? "Selecione uma categoria para visualizar atletas elegíveis."
    : loadError
      ? loadError
      : "Nenhum atleta elegível encontrado nas categorias inferiores.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(40rem,calc(100vw-1rem))] max-h-[calc(100vh-1rem)] sm:max-w-none">
        <DialogHeader>
          <DialogTitle>Indicação de subida</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Selecione atletas de categorias inferiores para indicar treinamentos com sua categoria.
          </p>
        </DialogHeader>

        {!readOnly ? (
          <div className="space-y-2">
            <Label htmlFor="promo-search">Buscar atleta</Label>
            <Input
              id="promo-search"
              value={search}
              placeholder="Nome ou categoria…"
              disabled={!categorySelected}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        ) : null}

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 && selections.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/30"
              >
                <CoachTeamReportPlayerAvatar name={c.name} photoUrl={c.photoUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.categoryLabel ??
                      (c.category ? getCategoryLabel(c.category, "pt", categories) : "—")}
                  </p>
                </div>
                {!readOnly ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => onAdd(c)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <Label>Indicações realizadas</Label>
          {selections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma indicação ainda.</p>
          ) : (
            <div className="space-y-3">
              {selections.map((s) => (
                <div
                  key={s.playerId}
                  className="rounded-lg border border-border/60 bg-muted/10 p-3"
                >
                  <div className="flex items-start gap-3">
                    <CoachTeamReportPlayerAvatar name={s.name} photoUrl={s.photoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.categoryLabel ??
                          (s.category ? getCategoryLabel(s.category, "pt", categories) : "—")}
                      </p>
                    </div>
                    {!readOnly ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 shrink-0 p-0 text-destructive"
                        onClick={() => onRemove(s.playerId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                  {!readOnly ? (
                    <Textarea
                      rows={2}
                      className="mt-2 text-sm"
                      value={s.reason}
                      placeholder="Motivo da recomendação (opcional)"
                      onChange={(e) => onReasonChange(s.playerId, e.target.value)}
                    />
                  ) : s.reason ? (
                    <p className="mt-2 text-sm text-muted-foreground">{s.reason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
