"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type DashboardThemePreference,
  useDashboardTheme,
} from "@/context/DashboardThemeContext";

const OPTIONS: {
  value: DashboardThemePreference;
  label: string;
  shortLabel: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "Claro", shortLabel: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", shortLabel: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", shortLabel: "Auto", icon: Monitor },
];

type DashboardThemeToggleProps = {
  /** Sidebar recolhida: só ícone */
  compact?: boolean;
  /** Botão ocupa a largura (rodapé da sidebar) */
  fullWidth?: boolean;
  className?: string;
};

export function DashboardThemeToggle({
  compact = false,
  fullWidth = false,
  className,
}: DashboardThemeToggleProps) {
  const { preference, resolvedTheme, setPreference } = useDashboardTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const ActiveIcon = resolvedTheme === "dark" ? Moon : Sun;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSelect = (value: DashboardThemePreference) => {
    setPreference(value);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size={compact ? "icon" : "sm"}
        className={cn(
          "shrink-0 text-muted-foreground hover:text-foreground",
          compact ? "h-9 w-9" : "h-9 gap-2 px-2.5",
          fullWidth && "w-full justify-start",
        )}
        aria-label="Tema da interface"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        title="Tema: claro, escuro ou sistema"
        onClick={() => setOpen((prev) => !prev)}
      >
        <ActiveIcon className="h-4 w-4 shrink-0" />
        {!compact ? <span className="hidden text-xs font-medium sm:inline">Tema</span> : null}
      </Button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Escolher tema"
          className={cn(
            "absolute z-[60] min-w-[10.5rem] rounded-lg border border-border bg-popover p-1 shadow-lg",
            compact ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2",
          )}
        >
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = preference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  selected
                    ? "bg-accent text-accent-foreground"
                    : "text-popover-foreground hover:bg-accent/60",
                )}
                onClick={() => handleSelect(option.value)}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                <span className="flex-1">{option.label}</span>
                {selected ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Ativo
                  </span>
                ) : null}
              </button>
            );
          })}
          <p className="border-t border-border px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
            {preference === "system"
              ? `Sistema: ${resolvedTheme === "dark" ? "escuro" : "claro"}`
              : preference === "dark"
                ? "Fundo escuro"
                : "Fundo claro"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
