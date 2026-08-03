"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AGENDA_COLOR_LABELS,
  DEFAULT_AGENDA_COLORS,
  loadAgendaColors,
  saveAgendaColors,
  type AgendaColorKey,
  type AgendaColorSwatch,
} from "@/lib/agenda-color-prefs";
import {
  DEFAULT_SQUAD_CATEGORY_COLORS,
  loadSquadCategoryColors,
  saveSquadCategoryColors,
  type SquadCategoryColor,
} from "@/lib/agenda-squad-category-colors";
import { getCategoryLabel, type FixtureCategoryItem } from "@/lib/fixture-categories";
import { cn } from "@/lib/utils";

type TabId = "squad" | "event";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Categorias de elenco ativas (cadastro). */
  squadCategories: readonly FixtureCategoryItem[];
  onColorsChange?: () => void;
};

function contrastText(bg: string): string {
  const hex = bg.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#18181b" : "#ffffff";
}

export function AgendaColorsDialog({
  open,
  onOpenChange,
  squadCategories,
  onColorsChange,
}: Props) {
  const [tab, setTab] = useState<TabId>("squad");
  const [eventColors, setEventColors] = useState<Record<AgendaColorKey, AgendaColorSwatch>>(
    () => ({ ...DEFAULT_AGENDA_COLORS }),
  );
  const [squadColors, setSquadColors] = useState<Record<string, SquadCategoryColor>>(() => ({
    ...DEFAULT_SQUAD_CATEGORY_COLORS,
  }));

  useEffect(() => {
    if (!open) return;
    setEventColors(loadAgendaColors());
    setSquadColors(loadSquadCategoryColors());
  }, [open]);

  const squadRows = useMemo(() => {
    const list: FixtureCategoryItem[] =
      squadCategories.length > 0
        ? [...squadCategories]
        : Object.keys(DEFAULT_SQUAD_CATEGORY_COLORS).map((value) => ({
            value,
            labelPT: getCategoryLabel(value, "pt"),
            labelEN: value,
          }));
    return list.sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.labelPT.localeCompare(b.labelPT),
    );
  }, [squadCategories]);

  const persistEvent = (next: Record<AgendaColorKey, AgendaColorSwatch>) => {
    setEventColors(next);
    saveAgendaColors(next);
    onColorsChange?.();
  };

  const persistSquad = (next: Record<string, SquadCategoryColor>) => {
    setSquadColors(next);
    saveSquadCategoryColors(next);
    onColorsChange?.();
  };

  const updateEventBg = (key: AgendaColorKey, bg: string) => {
    const sw = eventColors[key] ?? DEFAULT_AGENDA_COLORS[key];
    persistEvent({
      ...eventColors,
      [key]: { ...sw, bg, text: contrastText(bg), border: bg },
    });
  };

  const updateSquadBg = (value: string, bg: string) => {
    persistSquad({
      ...squadColors,
      [value]: { bg, text: contrastText(bg) },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cores da agenda</DialogTitle>
          <DialogDescription>
            Duas cores por compromisso: primeiro a do elenco (Sub-15, Sub-17…) e depois a do tipo
            (treino, jogo…). Preferências ficam neste navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="inline-flex w-full rounded-xl border border-border/80 bg-muted/30 p-1">
          {(
            [
              { id: "squad" as const, label: "1. Elenco (Sub-15…)" },
              { id: "event" as const, label: "2. Tipo (treino…)" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "min-h-[44px] flex-1 rounded-lg px-3 text-sm font-semibold transition-colors",
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "squad" ? (
          <div className="grid gap-3 py-1">
            <p className="text-xs text-muted-foreground">
              Cor que aparece no início do card/calendário (faixa da categoria).
            </p>
            {squadRows.map((cat) => {
              const sw = squadColors[cat.value] ?? DEFAULT_SQUAD_CATEGORY_COLORS[cat.value] ?? {
                bg: "#71717a",
                text: "#ffffff",
              };
              return (
                <div
                  key={cat.value}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium uppercase tracking-wide">{cat.labelPT}</p>
                    <span
                      className="mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: sw.bg, color: sw.text }}
                    >
                      {cat.labelPT}
                    </span>
                  </div>
                  <Input
                    type="color"
                    className="h-10 w-14 cursor-pointer p-1"
                    value={sw.bg}
                    onChange={(e) => updateSquadBg(cat.value, e.target.value)}
                    aria-label={`Cor de ${cat.labelPT}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-3 py-1">
            <p className="text-xs text-muted-foreground">
              Cor do fundo do compromisso (treino, jogo em casa, viagem…).
            </p>
            {(Object.keys(AGENDA_COLOR_LABELS) as AgendaColorKey[]).map((key) => {
              const sw = eventColors[key] ?? DEFAULT_AGENDA_COLORS[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{AGENDA_COLOR_LABELS[key]}</p>
                    <span
                      className="mt-1 inline-flex overflow-hidden rounded border text-[10px] font-bold uppercase tracking-wide"
                      style={{ borderColor: sw.border }}
                    >
                      <span
                        className="px-1.5 py-0.5"
                        style={{ backgroundColor: "#0284c7", color: "#fff" }}
                      >
                        Sub-15
                      </span>
                      <span
                        className="px-1.5 py-0.5"
                        style={{
                          backgroundColor: sw.bg,
                          color: sw.text,
                        }}
                      >
                        Exemplo
                      </span>
                    </span>
                  </div>
                  <Input
                    type="color"
                    className="h-10 w-14 cursor-pointer p-1"
                    value={sw.bg}
                    onChange={(e) => updateEventBg(key, e.target.value)}
                    aria-label={`Cor de ${AGENDA_COLOR_LABELS[key]}`}
                  />
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => {
              if (tab === "squad") {
                persistSquad({ ...DEFAULT_SQUAD_CATEGORY_COLORS });
              } else {
                persistEvent({ ...DEFAULT_AGENDA_COLORS });
              }
            }}
          >
            Restaurar padrão
          </Button>
          <Button type="button" className="min-h-[44px]" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
