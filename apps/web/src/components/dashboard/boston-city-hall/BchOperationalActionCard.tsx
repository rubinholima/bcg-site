"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT = {
  emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
  sky: "bg-sky-500/15 text-sky-300 ring-sky-500/25",
  violet: "bg-violet-500/15 text-violet-300 ring-violet-500/25",
  cyan: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/25",
  amber: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
  gold: "bg-amber-600/15 text-amber-200 ring-amber-500/30",
} as const;

export function BchOperationalActionCard({
  title,
  subtitle,
  metric,
  metricHint,
  href,
  actionLabel,
  icon: Icon,
  accent = "sky",
  disabled,
}: {
  title: string;
  subtitle: string;
  metric?: string | null;
  metricHint?: string | null;
  href: string;
  actionLabel: string;
  icon: LucideIcon;
  accent?: keyof typeof ACCENT;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1",
            ACCENT[accent],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-sm font-semibold text-slate-50">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {metric ? (
        <p className="mt-3 text-lg font-semibold tabular-nums tracking-tight text-slate-100">{metric}</p>
      ) : (
        <p className="mt-3 text-sm text-slate-500">—</p>
      )}
      {metricHint ? <p className="text-xs text-slate-500">{metricHint}</p> : null}
      <span className="mt-4 inline-flex text-xs font-medium text-sky-300/90">{actionLabel}</span>
    </>
  );

  const className = cn(
    "flex min-h-[168px] flex-col rounded-xl border border-slate-800/90 bg-[#0c1222]/80 p-4 transition-colors",
    disabled
      ? "cursor-default opacity-70"
      : "hover:border-sky-500/30 hover:bg-[#0e1628]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
  );

  if (disabled) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
