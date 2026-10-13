"use client";

import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "danger" | "info" | "gold";

const toneClass: Record<Tone, string> = {
  default: "border-slate-600/50 bg-slate-800/50 text-slate-200",
  gold: "border-amber-500/35 bg-amber-500/10 text-amber-100",
  success: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  danger: "border-red-500/35 bg-red-500/10 text-red-200",
  info: "border-sky-500/35 bg-sky-500/10 text-sky-200",
};

export function BchStatusBadge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[28px] items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
