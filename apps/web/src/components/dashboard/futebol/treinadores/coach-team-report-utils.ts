import { formatDateDayMonYear } from "@/lib/format-date";
import type { CoachTeamMonthlyReportStatus, CoachTeamReport } from "@/lib/treinadores-types";
import { COACH_TEAM_PERIOD_KEYS } from "@/lib/treinadores-types";

export const MONTHLY_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export type TeamReportTab = "visao-geral" | "avaliacoes" | "acoes" | "historico";

export function suggestMonthlyPeriodKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthlyPeriodLabel(periodKey: string): string {
  if (!MONTHLY_KEY_RE.test(periodKey)) return periodKey;
  const [year, month] = periodKey.split("-");
  const names = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${names[Number(month) - 1] ?? month} / ${year}`;
}

export function periodLabel(report: CoachTeamReport) {
  if (report.periodKey && MONTHLY_KEY_RE.test(report.periodKey)) {
    return monthlyPeriodLabel(report.periodKey);
  }
  if (report.periodKey) {
    const keyLabel =
      COACH_TEAM_PERIOD_KEYS.find((p) => p.value === report.periodKey)?.label ?? report.periodKey;
    const season = report.season ? ` ${report.season}` : "";
    if (report.periodStart && report.periodEnd) {
      return `${keyLabel}${season} · ${formatDateDayMonYear(new Date(report.periodStart))} – ${formatDateDayMonYear(new Date(report.periodEnd))}`;
    }
    return `${keyLabel}${season}`;
  }
  if (report.periodStart && report.periodEnd) {
    return `${formatDateDayMonYear(new Date(report.periodStart))} – ${formatDateDayMonYear(new Date(report.periodEnd))}`;
  }
  return report.periodType;
}

export function monthlyStatusLabel(status: CoachTeamMonthlyReportStatus) {
  switch (status) {
    case "enviado":
      return "Enviado";
    case "rascunho":
      return "Rascunho";
    case "atrasado":
      return "Atrasado";
    default:
      return "Pendente";
  }
}

export function monthlyStatusTone(status: CoachTeamMonthlyReportStatus) {
  switch (status) {
    case "enviado":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "rascunho":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    case "atrasado":
      return "border-red-500/40 bg-red-500/10 text-red-300";
    default:
      return "border-border/60 bg-muted/30 text-muted-foreground";
  }
}

export function truncateText(text: string | null | undefined, max = 72): string {
  if (!text?.trim()) return "—";
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export function scoreBadgeTone(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "border-border/60 bg-muted/30 text-muted-foreground";
  if (score >= 4) return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (score >= 3) return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  return "border-red-500/40 bg-red-500/10 text-red-300";
}

export function computeDeadlineInfo(periodEnd: string, reportStatus: string) {
  if (!periodEnd) return null;
  const end = new Date(`${periodEnd.slice(0, 10)}T23:59:59`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  if (reportStatus === "enviado") {
    return { tone: "sent" as const, label: "Relatório enviado" };
  }

  const diffMs = endDay.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { tone: "overdue" as const, label: "Relatório atrasado" };
  }

  return {
    tone: "pending" as const,
    label: `Entrega até ${formatDateDayMonYear(end)}`,
    sublabel: daysLeft === 0 ? "Vence hoje" : `Restam ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}`,
  };
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}
