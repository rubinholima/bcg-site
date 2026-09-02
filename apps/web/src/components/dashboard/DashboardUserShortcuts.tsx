"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
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
import {
  TopShortcutBar,
  TopShortcutLink,
  TopShortcutEmpty,
  TopShortcutIcon,
} from "@/components/dashboard/cup360";

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
      <TopShortcutBar>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </TopShortcutBar>
    );
  }

  return (
    <>
      <TopShortcutBar>
        {slots.map((href, index) => {
          const option = href ? optionMap.get(href) : null;

          if (option) {
            return (
              <TopShortcutLink
                key={`shortcut-${index}`}
                href={option.href}
                label={option.label}
                displayLabel={abbreviateShortcutLabel(option.label)}
                menuLogoSrc={option.menuLogoSrc}
                icon={option.icon}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openPicker(index);
                }}
              />
            );
          }

          return (
            <TopShortcutEmpty key={`shortcut-${index}`} onClick={() => openPicker(index)} />
          );
        })}
      </TopShortcutBar>

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
                      <TopShortcutIcon
                        menuLogoSrc={option.menuLogoSrc}
                        icon={option.icon}
                        className="h-5 w-5"
                      />
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
