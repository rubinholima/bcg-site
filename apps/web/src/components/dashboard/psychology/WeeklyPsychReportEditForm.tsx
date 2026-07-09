"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  WEEKLY_PSYCH_REPORT_FIELDS,
  type WeeklyPsychReportData,
} from "@/components/dashboard/psychology/WeeklyPsychReportDocument";

export type WeeklyPsychReportFormState = Pick<
  WeeklyPsychReportData,
  | "periodStart"
  | "periodEnd"
  | "categoriesLabel"
  | "activities"
  | "individualDemands"
  | "weeklyDevelopment"
  | "identifiedDemands"
  | "nextWeekPlanning"
  | "finalSummary"
  | "generalNotes"
>;

export function weeklyReportToFormState(report: WeeklyPsychReportData): WeeklyPsychReportFormState {
  return {
    periodStart: report.periodStart ?? "",
    periodEnd: report.periodEnd ?? "",
    categoriesLabel: report.categoriesLabel ?? "",
    activities: report.activities ?? "",
    individualDemands: report.individualDemands ?? "",
    weeklyDevelopment: report.weeklyDevelopment ?? "",
    identifiedDemands: report.identifiedDemands ?? "",
    nextWeekPlanning: report.nextWeekPlanning ?? "",
    finalSummary: report.finalSummary ?? "",
    generalNotes: report.generalNotes ?? "",
  };
}

export function WeeklyPsychReportEditForm({
  value,
  editComment,
  onChange,
  onEditCommentChange,
}: {
  value: WeeklyPsychReportFormState;
  editComment: string;
  onChange: (next: WeeklyPsychReportFormState) => void;
  onEditCommentChange: (comment: string) => void;
}) {
  const textFields = WEEKLY_PSYCH_REPORT_FIELDS.map((field) => ({
    key: field.key as keyof WeeklyPsychReportFormState,
    label: field.label,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Período — início</Label>
          <Input
            type="date"
            className="mt-1 text-foreground"
            value={value.periodStart ?? ""}
            onChange={(e) => onChange({ ...value, periodStart: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Período — fim</Label>
          <Input
            type="date"
            className="mt-1 text-foreground"
            value={value.periodEnd ?? ""}
            onChange={(e) => onChange({ ...value, periodEnd: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Categorias acompanhadas</Label>
        <Input
          className="mt-1 text-foreground"
          placeholder="Ex.: Sub-17 / Sub-20"
          value={value.categoriesLabel ?? ""}
          onChange={(e) => onChange({ ...value, categoriesLabel: e.target.value })}
        />
      </div>
      {textFields
        .filter((f) => f.key !== "periodStart" && f.key !== "periodEnd" && f.key !== "categoriesLabel")
        .map((field) => (
          <div key={field.key}>
            <Label className="text-xs text-muted-foreground">{field.label}</Label>
            <textarea
              className="mt-1 w-full min-h-[88px] rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={(value[field.key] as string | null | undefined) ?? ""}
              onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
            />
          </div>
        ))}
      <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
        <Label className="text-xs font-medium text-violet-800 dark:text-violet-200">
          Comentário desta alteração (opcional)
        </Label>
        <textarea
          className="mt-2 w-full min-h-[72px] rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
          placeholder="Ex.: Juliana — ajuste após reunião com a comissão técnica."
          value={editComment}
          onChange={(e) => onEditCommentChange(e.target.value)}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          O comentário fica registrado no histórico com seu nome e data/hora.
        </p>
      </div>
    </div>
  );
}
