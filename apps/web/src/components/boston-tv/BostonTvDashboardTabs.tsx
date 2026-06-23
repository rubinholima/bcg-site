"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function BostonTvDashboardTabs<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel = "Seções",
  wrap = true,
  uppercase = false,
  compact = false,
  dense = false,
  stretch = false,
}: {
  tabs: Array<{ id: T; label: string; icon?: LucideIcon }>;
  active: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  /** false = uma linha com scroll horizontal (útil para muitas abas) */
  wrap?: boolean;
  /** rótulos em caixa alta */
  uppercase?: boolean;
  /** abas menores — cadastro de atleta, consultas, etc. */
  compact?: boolean;
  /** ainda menor — muitas abas na mesma linha, sem barra de rolagem */
  dense?: boolean;
  /** cada aba ocupa largura igual — preenche 100% da linha */
  stretch?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-1 sm:gap-1.5",
        stretch && "w-full flex-nowrap",
        !stretch &&
          (wrap
            ? "flex-wrap"
            : cn(
                "flex-nowrap overflow-x-auto pb-0.5",
                "[scrollbar-width:thin] [scrollbar-color:rgba(139,92,246,0.35)_transparent]",
                "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-500/35 [&::-webkit-scrollbar-track]:bg-transparent",
              )),
      )}
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            title={label}
            className={cn(
              "group relative inline-flex items-center rounded-lg border transition-all duration-200",
              stretch
                ? "min-w-0 flex-1 basis-0 justify-center"
                : "shrink-0",
              dense
                ? "min-h-[30px] gap-1 px-1.5 py-1 text-[10px] sm:px-2"
                : compact
                  ? "min-h-[34px] gap-1 px-2 py-1 text-xs sm:px-2"
                  : "min-h-[48px] gap-2.5 rounded-xl px-3.5 py-2.5 text-sm sm:px-4",
              isActive
                ? "border-violet-500/55 bg-gradient-to-br from-violet-950/90 via-violet-900/35 to-zinc-900/80 font-semibold text-white shadow-[0_4px_24px_-6px_rgba(139,92,246,0.55)] ring-1 ring-violet-400/35"
                : "border-border/80 bg-zinc-900/50 font-medium text-zinc-400 hover:border-violet-500/30 hover:bg-zinc-800/70 hover:text-zinc-100",
            )}
          >
            {Icon ? (
              dense ? (
                <Icon
                  className={cn(
                    "h-3 w-3 shrink-0",
                    isActive ? "text-violet-200" : "text-zinc-500 group-hover:text-violet-200",
                  )}
                />
              ) : (
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-md border transition-colors",
                    compact ? "h-5 w-5" : "h-8 w-8 rounded-lg",
                    isActive
                      ? "border-violet-400/40 bg-violet-500/25 text-violet-100"
                      : "border-border/60 bg-zinc-800/80 text-zinc-500 group-hover:border-violet-500/25 group-hover:bg-violet-500/10 group-hover:text-violet-200",
                  )}
                >
                  <Icon className={compact ? "h-3 w-3" : "h-4 w-4"} />
                </span>
              )
            ) : null}
            <span
              className={cn(
                "tracking-tight",
                stretch ? "truncate text-center" : "whitespace-nowrap",
                uppercase &&
                  (dense
                    ? "text-[9px] font-semibold uppercase tracking-wide sm:text-[10px]"
                    : compact
                      ? "text-[10px] font-semibold uppercase tracking-wide sm:text-[11px]"
                      : "text-xs font-semibold uppercase tracking-wider sm:text-sm"),
              )}
            >
              {label}
            </span>
            {isActive ? (
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute -inset-px bg-gradient-to-br from-violet-500/20 via-transparent to-transparent opacity-80",
                  compact || dense ? "rounded-lg" : "rounded-xl",
                )}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
