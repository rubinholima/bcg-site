"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  DASHBOARD_SHORTCUT_SLOTS,
  buildDashboardShortcutMap,
  collectDashboardShortcutOptions,
  normalizeShortcutSlots,
  type DashboardShortcutOption,
} from "@/lib/dashboard-shortcuts";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function ShortcutIcon({
  option,
  className = "h-4 w-4 shrink-0",
}: {
  option: DashboardShortcutOption;
  className?: string;
}) {
  if (option.menuLogoSrc) {
    return (
      <img
        src={option.menuLogoSrc}
        alt=""
        className={cn("rounded-full object-contain", className)}
      />
    );
  }
  const Icon = option.icon;
  if (!Icon) return null;
  return <Icon className={cn("text-violet-400", className)} />;
}

/** Nome curto para caber na barra superior. */
function abbreviateShortcutLabel(label: string, maxLen = 14): string {
  let text = label
    .replace(/^Depto\.?\s+(de\s+)?/i, "")
    .replace(/^Cadastros?\s*[-–]?\s*/i, "")
    .trim();
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > 5) return `${slice.slice(0, lastSpace)}…`;
  return `${slice}…`;
}

const shortcutBtnClass =
  "flex h-9 min-w-[5.5rem] max-w-[8.25rem] shrink-0 items-center gap-1.5 rounded-lg px-2 sm:h-10 sm:min-w-[6.25rem] sm:max-w-[9rem] sm:px-2.5";

/** Atalhos personalizados na barra superior do dashboard. */
export function DashboardHeaderShortcuts() {
  const { canAccessModule, canAccessDashboard, loading: authLoading } = useAuth();
  const [slots, setSlots] = useState<(string | null)[]>(() => normalizeShortcutSlots(null));
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const optionMap = useMemo(
    () => buildDashboardShortcutMap(canAccessModule, canAccessDashboard),
    [canAccessModule, canAccessDashboard],
  );

  const options = useMemo(
    () => collectDashboardShortcutOptions(canAccessModule, canAccessDashboard),
    [canAccessModule, canAccessDashboard],
  );

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const loadShortcuts = useCallback(async () => {
    try {
      const { data } = await api.get<{ slots: (string | null)[] }>("/me/dashboard-shortcuts");
      setSlots(normalizeShortcutSlots(data?.slots));
    } catch {
      setSlots(normalizeShortcutSlots(null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void loadShortcuts();
  }, [authLoading, loadShortcuts]);

  const persistSlots = async (next: (string | null)[]) => {
    try {
      const { data } = await api.patch<{ slots: (string | null)[] }>("/me/dashboard-shortcuts", {
        slots: next,
      });
      setSlots(normalizeShortcutSlots(data?.slots ?? next));
    } catch {
      await loadShortcuts();
    }
  };

  const openPicker = (index: number) => {
    setEditingIndex(index);
    setSearch("");
    setPickerOpen(true);
  };

  const selectShortcut = (href: string) => {
    if (editingIndex === null) return;
    const next = [...slots];
    next[editingIndex] = href;
    setPickerOpen(false);
    setEditingIndex(null);
    void persistSlots(next);
  };

  const clearSlot = (index: number) => {
    const next = [...slots];
    next[index] = null;
    void persistSlots(next);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 md:justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div
        className="flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-x-auto overscroll-x-contain md:justify-center md:gap-2"
        aria-label="Meus atalhos"
      >
        {slots.map((href, index) => {
          const option = href ? optionMap.get(href) : null;

          if (option) {
            return (
              <Link
                key={`shortcut-${index}`}
                href={option.href}
                title={option.label}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openPicker(index);
                }}
                className={cn(
                  shortcutBtnClass,
                  "border border-violet-500/25 bg-violet-950/30 transition-colors hover:border-violet-500/50 hover:bg-violet-950/50",
                )}
              >
                <ShortcutIcon option={option} className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate text-[11px] font-medium leading-tight sm:text-xs">
                  {abbreviateShortcutLabel(option.label)}
                </span>
              </Link>
            );
          }

          return (
            <button
              key={`shortcut-${index}`}
              type="button"
              title="Adicionar atalho"
              onClick={() => openPicker(index)}
              className={cn(
                shortcutBtnClass,
                "justify-center border border-dashed border-muted-foreground/35 text-muted-foreground transition-colors hover:border-violet-500/40 hover:bg-violet-950/20 hover:text-foreground",
              )}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate text-[11px] font-medium leading-tight sm:text-xs">Atalho</span>
            </button>
          );
        })}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="flex max-h-[85dvh] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-5 py-4 text-left">
            <DialogTitle>Escolher atalho</DialogTitle>
            <DialogDescription>
              Só aparecem páginas que você tem acesso. Espaço{" "}
              {editingIndex !== null ? editingIndex + 1 : ""} de {DASHBOARD_SHORTCUT_SLOTS}.
              {editingIndex !== null && slots[editingIndex] ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="text-destructive underline-offset-2 hover:underline"
                    onClick={() => {
                      clearSlot(editingIndex);
                      setPickerOpen(false);
                      setEditingIndex(null);
                    }}
                  >
                    Remover atalho atual
                  </button>
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="border-b border-border px-5 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar página…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-[44px] pl-9 text-foreground"
              />
            </div>
          </div>
          <ul className="max-h-[50dvh] overflow-y-auto px-2 py-2">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nenhuma página encontrada
              </li>
            ) : (
              filteredOptions.map((option) => {
                const alreadyUsed = slots.includes(option.href);
                return (
                  <li key={option.href}>
                    <button
                      type="button"
                      disabled={alreadyUsed}
                      onClick={() => selectShortcut(option.href)}
                      className={cn(
                        "flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        alreadyUsed
                          ? "cursor-not-allowed opacity-40"
                          : "hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <ShortcutIcon option={option} className="h-5 w-5" />
                      <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                      {alreadyUsed ? (
                        <span className="shrink-0 text-xs text-muted-foreground">Em uso</span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
