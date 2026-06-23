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
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-1.5 overflow-x-auto pb-0.5 sm:gap-2",
        "[scrollbar-width:thin] [scrollbar-color:rgba(139,92,246,0.35)_transparent]",
        "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-500/35 [&::-webkit-scrollbar-track]:bg-transparent",
        wrap ? "sm:flex-wrap" : "flex-nowrap",
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
            className={cn(
              "group relative inline-flex shrink-0 items-center rounded-lg border transition-all duration-200",
              compact
                ? "min-h-[36px] gap-1.5 px-2 py-1.5 text-xs sm:px-2.5"
                : "min-h-[48px] gap-2.5 rounded-xl px-3.5 py-2.5 text-sm sm:px-4",
              isActive
                ? "border-violet-500/55 bg-gradient-to-br from-violet-950/90 via-violet-900/35 to-zinc-900/80 font-semibold text-white shadow-[0_4px_24px_-6px_rgba(139,92,246,0.55)] ring-1 ring-violet-400/35"
                : "border-border/80 bg-zinc-900/50 font-medium text-zinc-400 hover:border-violet-500/30 hover:bg-zinc-800/70 hover:text-zinc-100",
            )}
          >
            {Icon ? (
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-md border transition-colors",
                  compact ? "h-6 w-6" : "h-8 w-8 rounded-lg",
                  isActive
                    ? "border-violet-400/40 bg-violet-500/25 text-violet-100"
                    : "border-border/60 bg-zinc-800/80 text-zinc-500 group-hover:border-violet-500/25 group-hover:bg-violet-500/10 group-hover:text-violet-200",
                )}
              >
                <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              </span>
            ) : null}
            <span
              className={cn(
                "whitespace-nowrap tracking-tight",
                uppercase && (compact ? "text-[10px] font-semibold uppercase tracking-wider sm:text-xs" : "text-xs font-semibold uppercase tracking-wider sm:text-sm"),
              )}
            >
              {label}
            </span>
            {isActive ? (
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute -inset-px bg-gradient-to-br from-violet-500/20 via-transparent to-transparent opacity-80",
                  compact ? "rounded-lg" : "rounded-xl",
                )}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
