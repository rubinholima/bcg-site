export const PHYSIO_TRANSITION_WORK_TYPE_LABEL: Record<string, string> = {
  integrado_fisiologia_preparacao: "Integrado (fisiologia + preparação + fisio)",
  campo: "Campo",
  ginasio: "Ginásio",
  piscina: "Piscina",
  outro: "Outro",
};

export function formatDurationMinutes(total: number): string {
  if (total <= 0) return "—";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function transitionWorkTypeLabel(workType: string, custom?: string | null) {
  if (workType === "outro" && custom?.trim()) return custom.trim();
  return PHYSIO_TRANSITION_WORK_TYPE_LABEL[workType] ?? custom ?? workType;
}
