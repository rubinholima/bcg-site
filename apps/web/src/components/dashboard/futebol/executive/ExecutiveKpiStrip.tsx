"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecutiveKpi } from "@/lib/futebol-executive-types";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { ExecutiveRing } from "./ExecutiveRing";

const KPI_ICONS: Record<string, LucideIcon> = {
  athletes: Users,
  availability: ShieldCheck,
  decisions: ClipboardCheck,
  alerts: AlertTriangle,
  "captacao-action": UserPlus,
  agenda: CalendarDays,
};

function breakdownLabel(key: string): string {
  if (key === "total") return "Total";
  if (key === "indisponivel") return "Indisp.";
  if (key === "atencao") return "Atenção";
  if (key === "sem_agendamento") return "Sem CT";
  if (key === "aprovacao_supervisor") return "Supervisor";
  return getCategoryLabel(key, "pt") || key.replace(/_/g, " ");
}

function KpiCard({
  kpi,
  children,
}: {
  kpi: ExecutiveKpi;
  children: React.ReactNode;
}) {
  const Icon = KPI_ICONS[kpi.id] ?? Users;
  const accent =
    kpi.id === "decisions" && kpi.value > 0
      ? "border-amber-500/30"
      : kpi.id === "alerts" && kpi.value > 0
        ? "border-red-500/30"
        : "border-border/70";

  const inner = (
    <div
      className={cn(
        "flex h-full min-h-[88px] items-center gap-3 rounded-lg border bg-zinc-950/80 px-3 py-2.5 transition-colors",
        accent,
        kpi.href && "hover:border-primary/35 hover:bg-zinc-900/90",
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );

  if (kpi.href?.startsWith("/")) {
    return (
      <Link href={kpi.href} className="block min-w-0">
        {inner}
      </Link>
    );
  }
  if (kpi.href?.startsWith("#")) {
    return (
      <a href={kpi.href} className="block min-w-0">
        {inner}
      </a>
    );
  }
  return inner;
}

export function ExecutiveKpiStrip({ kpis }: { kpis: ExecutiveKpi[] }) {
  if (kpis.length === 0) return null;

  const cols =
    kpis.length >= 6 ? "xl:grid-cols-6" : kpis.length === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4";

  return (
    <div className={cn("grid grid-cols-2 gap-2 md:grid-cols-3", cols)}>
      {kpis.map((kpi) => {
        if (kpi.id === "availability") {
          const total = kpi.breakdown?.total ?? kpi.value + (kpi.breakdown?.indisponivel ?? 0);
          const pct = total > 0 ? Math.round((kpi.value / total) * 100) : 0;
          return (
            <KpiCard key={kpi.id} kpi={kpi}>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {kpi.label}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <ExecutiveRing
                  value={kpi.value}
                  total={total}
                  size={36}
                  stroke={3}
                  fillClassName={pct >= 70 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-red-400"}
                />
                <div>
                  <p className="text-xl font-bold tabular-nums leading-none">{pct}%</p>
                  <p className="text-[10px] text-muted-foreground">
                    {kpi.value}/{total} disp.
                  </p>
                </div>
              </div>
            </KpiCard>
          );
        }

        const hints = kpi.breakdown
          ? Object.entries(kpi.breakdown)
              .filter(([k, v]) => k !== "total" && v > 0)
              .slice(0, 2)
          : [];

        const valueClass =
          kpi.id === "decisions" && kpi.value > 0
            ? "text-amber-400"
            : kpi.id === "alerts" && kpi.value > 0
              ? "text-red-400"
              : "text-foreground";

        return (
          <KpiCard key={kpi.id} kpi={kpi}>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {kpi.label}
            </p>
            <p className={cn("text-2xl font-bold tabular-nums leading-tight", valueClass)}>
              {kpi.value}
            </p>
            {hints.length > 0 ? (
              <p className="truncate text-[10px] text-muted-foreground">
                {hints.map(([k, v]) => `${breakdownLabel(k)} ${v}`).join(" · ")}
              </p>
            ) : kpi.id === "athletes" && kpi.breakdown ? (
              <p className="truncate text-[10px] text-muted-foreground">
                {Object.entries(kpi.breakdown)
                  .slice(0, 2)
                  .map(([k, v]) => `${breakdownLabel(k)} ${v}`)
                  .join(" · ")}
              </p>
            ) : null}
          </KpiCard>
        );
      })}
    </div>
  );
}
