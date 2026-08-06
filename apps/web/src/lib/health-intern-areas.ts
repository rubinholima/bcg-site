/** Áreas de atuação do estagiário no futebol / Depto Saúde */
export const HEALTH_INTERN_AREAS = [
  { value: "medicina", label: "Medicina" },
  { value: "psicologia", label: "Psicologia" },
  { value: "fisioterapia", label: "Fisioterapia" },
  { value: "enfermagem", label: "Enfermagem" },
  { value: "nutricao", label: "Nutrição" },
  { value: "fisiologia", label: "Fisiologia" },
  { value: "massagem", label: "Massagem" },
  { value: "outro", label: "Outro" },
] as const;

export type HealthInternArea = (typeof HEALTH_INTERN_AREAS)[number]["value"];

export function healthInternAreaLabel(area: string): string {
  return HEALTH_INTERN_AREAS.find((a) => a.value === area)?.label ?? area;
}
