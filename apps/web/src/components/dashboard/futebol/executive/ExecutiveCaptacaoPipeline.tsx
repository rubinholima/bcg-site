"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CT_STATUS_LABEL } from "@/lib/futebol-executive-access";
import type { ExecutiveCaptacaoSummary } from "@/lib/futebol-executive-types";
import { ExecutiveActionList } from "./ExecutiveActionList";

const PIPELINE_STAGES: Array<{
  key: string;
  label: string;
  getCount: (c: ExecutiveCaptacaoSummary) => number;
  highlight?: boolean;
}> = [
  { key: "active", label: "Ativos", getCount: (c) => c.active },
  {
    key: "nao_agendado",
    label: "Sem agend.",
    getCount: (c) => c.awaitingSchedule,
    highlight: true,
  },
  {
    key: "agendado",
    label: "Agendados",
    getCount: (c) => c.byCtStatus.agendado ?? 0,
  },
  {
    key: "compareceu",
    label: "Compareceram",
    getCount: (c) => c.byCtStatus.compareceu ?? 0,
  },
  {
    key: "em_avaliacao",
    label: "Aval. CT",
    getCount: (c) => c.byCtStatus.em_avaliacao ?? 0,
  },
  {
    key: "concluido",
    label: "Concluídos",
    getCount: (c) => c.byCtStatus.concluido ?? 0,
  },
];

export function ExecutiveCaptacaoPipeline({
  captacao,
}: {
  captacao: ExecutiveCaptacaoSummary;
}) {
  const alerts = [
    captacao.awaitingSchedule > 0,
    captacao.physioPending > 0,
    captacao.physioRejected > 0,
    captacao.supervisorApprovalPending > 0,
  ].some(Boolean);

  return (
    <section className="rounded-lg border border-border/70 bg-zinc-950/80">
      <header className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[11px] font-semibold uppercase tracking-wide">
            Captação / Try-out
          </h2>
        </div>
        <Link href="/dashboard/futebol/captacao" className="text-[11px] text-primary hover:underline">
          Abrir
        </Link>
      </header>

      <div className="p-3">
        <div className="flex items-stretch gap-0.5 overflow-x-auto pb-1">
          {PIPELINE_STAGES.map((stage, idx) => {
            const count = stage.getCount(captacao);
            const hot = stage.highlight && count > 0;
            return (
              <div key={stage.key} className="flex min-w-[72px] flex-1 items-center">
                {idx > 0 ? (
                  <span className="mx-0.5 text-[10px] text-muted-foreground/40">→</span>
                ) : null}
                <div
                  className={cn(
                    "flex flex-1 flex-col items-center rounded border px-1 py-1.5 text-center",
                    hot
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border/50 bg-zinc-900/40",
                  )}
                >
                  <span className="text-[9px] uppercase text-muted-foreground">{stage.label}</span>
                  <span className={cn("text-sm font-bold tabular-nums", hot && "text-amber-400")}>
                    {count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {alerts ? (
          <div className="mt-2 flex flex-wrap gap-2 border-t border-border/40 pt-2">
            {captacao.supervisorApprovalPending > 0 ? (
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                Supervisor: {captacao.supervisorApprovalPending}
              </span>
            ) : null}
            {captacao.physioPending > 0 ? (
              <span className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-300">
                Fisio pend.: {captacao.physioPending}
              </span>
            ) : null}
            {captacao.physioRejected > 0 ? (
              <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300">
                Fisio reprov.: {captacao.physioRejected}
              </span>
            ) : null}
            {(captacao.byCtStatus.faltou ?? 0) > 0 ? (
              <span className="rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-300">
                No-show: {captacao.byCtStatus.faltou}
              </span>
            ) : null}
          </div>
        ) : null}

        {captacao.items.length > 0 ? (
          <div className="mt-2 border-t border-border/40 pt-1">
            <ExecutiveActionList items={captacao.items.slice(0, 4)} emptyLabel="" maxHeight="120px" />
          </div>
        ) : null}

        {Object.keys(captacao.byCtStatus).length > 0 ? (
          <p className="mt-2 truncate text-[10px] text-muted-foreground/60">
            {Object.entries(captacao.byCtStatus)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => `${CT_STATUS_LABEL[k] ?? k}: ${v}`)
              .join(" · ")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
