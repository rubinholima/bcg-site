"use client";

import type { WeeklyPsychReportEditLogEntry } from "@/components/dashboard/psychology/WeeklyPsychReportEditLog";
import { formatPersonFirstLastName } from "@/lib/consultation-display";
import { formatDateDayMonYear } from "@/lib/format-date";
import { cn } from "@/lib/utils";

export type WeeklyPsychReportData = {
  id?: string;
  date: string;
  time?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  categoriesLabel?: string | null;
  activities?: string | null;
  individualDemands?: string | null;
  weeklyDevelopment?: string | null;
  identifiedDemands?: string | null;
  nextWeekPlanning?: string | null;
  finalSummary?: string | null;
  generalNotes?: string | null;
  psychologistName?: string | null;
  estagiarioName?: string | null;
  editLog?: WeeklyPsychReportEditLogEntry[] | null;
  tenant?: { id: string; name: string; slug?: string } | null;
};

export const WEEKLY_PSYCH_REPORT_FIELDS: Array<{
  key: keyof WeeklyPsychReportData;
  label: string;
}> = [
  { key: "activities", label: "Atividades realizadas" },
  { key: "individualDemands", label: "Demandas individuais (comissão)" },
  { key: "weeklyDevelopment", label: "Desenvolvimento observado na semana" },
  { key: "identifiedDemands", label: "Demandas identificadas" },
  { key: "nextWeekPlanning", label: "Planejamento próxima semana" },
  { key: "finalSummary", label: "Resumo final" },
  { key: "generalNotes", label: "Observações gerais" },
];

function formatBrDate(d?: string | null): string {
  return formatDateDayMonYear(d);
}

function MetaItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-violet-200/80 bg-slate-50/80 px-4 py-3 dark:border-violet-500/25 dark:bg-violet-950/20",
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium leading-snug text-slate-900 dark:text-foreground">{value}</p>
    </div>
  );
}

function ReportSection({ label, value }: { label: string; value: string }) {
  return (
    <section className="border-b border-border/60 pb-5 last:border-b-0 last:pb-0">
      <h3 className="mb-2 border-l-4 border-violet-500 pl-3 text-xs font-bold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
        {label}
      </h3>
      <div className="whitespace-pre-wrap pl-1 text-[15px] leading-[1.75] text-foreground/95">
        {value}
      </div>
    </section>
  );
}

export function WeeklyPsychReportDocument({
  report,
  className,
}: {
  report: WeeklyPsychReportData;
  className?: string;
}) {
  const psychologist = formatPersonFirstLastName(report.psychologistName) || "—";
  const estagiario = formatPersonFirstLastName(report.estagiarioName) || "—";
  const filledSections = WEEKLY_PSYCH_REPORT_FIELDS.filter((field) =>
    (report[field.key] as string | null | undefined)?.trim()
  );

  return (
    <article className={cn("space-y-6", className)}>
      <header className="overflow-hidden rounded-2xl border border-violet-200/90 bg-gradient-to-br from-slate-50 via-white to-violet-50/60 dark:border-violet-500/30 dark:from-violet-950/40 dark:via-background dark:to-background">
        <div className="border-b border-violet-200/60 px-6 py-5 dark:border-violet-500/20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
            Boston City Group · Psicologia
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground sm:text-[1.65rem]">
            Relatório semanal
          </h2>
          <p className="mt-1 text-base font-medium text-slate-600 dark:text-muted-foreground">
            {report.tenant?.name ?? "—"}
          </p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <MetaItem
            label="Data do registro"
            value={`${formatBrDate(report.date)}${report.time ? ` · ${report.time}` : ""}`}
          />
          <MetaItem
            label="Período"
            value={`${formatBrDate(report.periodStart)} – ${formatBrDate(report.periodEnd)}`}
          />
          <MetaItem label="Categorias" value={report.categoriesLabel?.trim() || "—"} />
          <MetaItem label="Psicóloga(o)" value={psychologist} />
          <MetaItem label="Estagiária(o)" value={estagiario} />
        </div>
      </header>

      {filledSections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Este relatório não tem campos de texto preenchidos.
        </p>
      ) : (
        <div className="space-y-5 rounded-xl border border-border/70 bg-card/30 p-5 sm:p-6">
          {filledSections.map((field) => (
            <ReportSection
              key={field.key}
              label={field.label}
              value={(report[field.key] as string).trim()}
            />
          ))}
        </div>
      )}
    </article>
  );
}
