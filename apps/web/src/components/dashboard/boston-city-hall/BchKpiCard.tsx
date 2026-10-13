"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "gold" | "success" | "warning" | "danger" | "info";

const toneRing: Record<Tone, string> = {
  default: "border-slate-700/80",
  gold: "border-amber-500/35",
  success: "border-emerald-500/30",
  warning: "border-amber-500/40",
  danger: "border-red-500/35",
  info: "border-sky-500/30",
};

const toneIcon: Record<Tone, string> = {
  default: "text-slate-400",
  gold: "text-amber-400",
  success: "text-emerald-400",
  warning: "text-amber-300",
  danger: "text-red-400",
  info: "text-sky-400",
};

export function BchKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br from-[#0a0f1a] to-[#111827] p-4 shadow-sm",
        toneRing[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-50">{value}</p>
          {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
        {Icon ? <Icon className={cn("h-5 w-5 shrink-0", toneIcon[tone])} aria-hidden /> : null}
      </div>
    </div>
  );
}
