"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ExecutiveKpi } from "@/lib/futebol-executive-types";
import { getCategoryLabel } from "@/lib/fixture-categories";

function breakdownLabel(key: string): string {
  if (key === "total") return "Total";
  return getCategoryLabel(key, "pt") || key.replace(/_/g, " ");
}

export function ExecutiveKpiStrip({ kpis }: { kpis: ExecutiveKpi[] }) {
  if (kpis.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => {
        const topBreakdown = kpi.breakdown
          ? Object.entries(kpi.breakdown)
              .filter(([k]) => k !== "total")
              .slice(0, 3)
          : [];

        const inner = (
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-zinc-900/90 to-zinc-950/95 p-4 shadow-sm transition-all",
              kpi.href && "hover:border-primary/40 hover:shadow-md",
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {kpi.label}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {kpi.value}
            </p>
            {topBreakdown.length > 0 ? (
              <div className="mt-2 space-y-0.5">
                {topBreakdown.map(([key, val]) => (
                  <p key={key} className="truncate text-[11px] text-muted-foreground">
                    <span className="text-foreground/80">{breakdownLabel(key)}</span> · {val}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        );

        if (kpi.href?.startsWith("/")) {
          return (
            <Link key={kpi.id} href={kpi.href} className="block min-w-0">
              {inner}
            </Link>
          );
        }
        if (kpi.href?.startsWith("#")) {
          return (
            <a key={kpi.id} href={kpi.href} className="block min-w-0">
              {inner}
            </a>
          );
        }
        return <div key={kpi.id}>{inner}</div>;
      })}
    </div>
  );
}
