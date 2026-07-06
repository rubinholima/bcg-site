"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  type DashboardThemePreference,
  useDashboardTheme,
} from "@/context/DashboardThemeContext";

const OPTIONS: {
  value: DashboardThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "Claro", description: "Fundo claro e texto escuro", icon: Sun },
  { value: "dark", label: "Escuro", description: "Fundo escuro (padrão do painel)", icon: Moon },
  { value: "system", label: "Sistema", description: "Segue o tema do Windows/Chrome", icon: Monitor },
];

type DashboardThemeToggleProps = {
  compact?: boolean;
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

  const ActiveIcon = resolvedTheme === "dark" ? Moon : Sun;

  const handleSelect = (value: DashboardThemePreference) => {
    setPreference(value);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={compact ? "icon" : "sm"}
        className={cn(
          "shrink-0 text-muted-foreground hover:text-foreground",
          compact ? "h-9 w-9" : "h-9 gap-2 px-2.5",
          fullWidth && "w-full justify-start",
          className,
        )}
        aria-label="Tema da interface"
        title="Tema: claro, escuro ou sistema"
        onClick={() => setOpen(true)}
      >
        <ActiveIcon className="h-4 w-4 shrink-0" />
        {!compact ? <span className="hidden text-xs font-medium sm:inline">Tema</span> : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm gap-0 overflow-hidden p-0" showCloseButton>
          <DialogHeader className="border-b border-border px-5 py-4 text-left">
            <DialogTitle>Tema da interface</DialogTitle>
            <DialogDescription>
              Escolha como o dashboard deve aparecer neste navegador.
            </DialogDescription>
          </DialogHeader>
          <ul className="p-2" role="listbox" aria-label="Escolher tema">
            {OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = preference === option.value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex min-h-[52px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-accent/60",
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                        selected ? "border-primary/30 bg-background" : "border-border bg-muted/40",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="block text-xs text-muted-foreground">{option.description}</span>
                    </span>
                    {selected ? (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-primary">
                        Ativo
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            {preference === "system"
              ? `Sistema aplicado: ${resolvedTheme === "dark" ? "escuro" : "claro"}`
              : preference === "dark"
                ? "Modo escuro selecionado"
                : "Modo claro selecionado"}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
