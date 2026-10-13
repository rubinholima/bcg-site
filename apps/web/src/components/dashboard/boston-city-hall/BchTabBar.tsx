"use client";

import { cn } from "@/lib/utils";

export type BchTabItem<T extends string = string> = { id: T; label: string };

/** Abas locais — flex-wrap, sem scroll horizontal. */
export function BchTabBar<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: BchTabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 rounded-xl border border-slate-800/80 bg-[#0a0f1a]/70 p-1",
        className,
      )}
      role="tablist"
    >
      {tabs.map((t) => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.id)}
            className={cn(
              "min-h-[44px] shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
              selected
                ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/30 shadow-sm"
                : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-100",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
