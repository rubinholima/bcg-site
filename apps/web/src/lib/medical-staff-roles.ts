/** Cargos do Depto Médico (médicos, enfermeiros, fisioterapeutas, etc.) */
export const MEDICAL_STAFF_ROLES = [
  { value: "medico", label: "Médico" },
  { value: "enfermeiro", label: "Enfermeiro(a)" },
  { value: "enfermeiro_tec", label: "Técnico(a) de Enfermagem" },
  { value: "fisioterapeuta", label: "Fisioterapeuta" },
  { value: "nutricionista", label: "Nutricionista" },
  { value: "fisiologista", label: "Fisiologista" },
  { value: "massagista", label: "Massagista" },
  { value: "outro", label: "Outro" },
] as const;

/** Registro profissional por cargo: CRM (médico), COREN (enfermeiro), etc. */
export const REGISTRY_LABELS: Record<string, string> = {
  medico: "CRM",
  enfermeiro: "COREN",
  enfermeiro_tec: "COREN",
  fisioterapeuta: "CREFITO",
  nutricionista: "CRN",
  fisiologista: "CREF",
  massagista: "Registro",
  outro: "Registro",
};

export function getRegistryLabel(role: string): string {
  return REGISTRY_LABELS[role] ?? "Registro";
}
