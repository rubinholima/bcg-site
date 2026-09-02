"use client";

import Link from "next/link";
import { AlertTriangle, ClipboardCheck } from "lucide-react";
import type { ExecutiveActionItem } from "@/lib/futebol-executive-types";
import { ExecutiveActionList } from "./ExecutiveActionList";

function SidePanel({
  id,
  title,
  icon: Icon,
  count,
  children,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-lg border border-border/70 bg-zinc-950/80">
      <header className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[11px] font-semibold uppercase tracking-wide">{title}</h2>
        </div>
        {count > 0 ? (
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] tabular-nums font-medium">
            {count}
          </span>
        ) : null}
      </header>
      <div className="px-2 pb-1">{children}</div>
    </section>
  );
}

export function ExecutiveDecisionsAlertsColumn({
  decisions,
  alerts,
}: {
  decisions: ExecutiveActionItem[];
  alerts: ExecutiveActionItem[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <SidePanel id="decisoes" title="Central de Decisões" icon={ClipboardCheck} count={decisions.length}>
        <ExecutiveActionList
          items={decisions.slice(0, 8)}
          emptyLabel="✓ Nenhuma decisão pendente"
          emptyPositive
          maxHeight="220px"
        />
      </SidePanel>
      <SidePanel id="alertas" title="Alertas" icon={AlertTriangle} count={alerts.length}>
        <ExecutiveActionList
          items={alerts.slice(0, 10)}
          emptyLabel="Nenhum alerta operacional"
          maxHeight="280px"
        />
      </SidePanel>
    </div>
  );
}

export function ExecutiveCompactStat({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href?: string;
  highlight?: "danger" | "warning";
}) {
  const content = (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={
          highlight === "danger"
            ? "text-sm font-bold tabular-nums text-red-400"
            : highlight === "warning"
              ? "text-sm font-bold tabular-nums text-amber-400"
              : "text-sm font-bold tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block rounded hover:bg-muted/20">
        {content}
      </Link>
    );
  }
  return content;
}
