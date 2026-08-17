/** Funções da comissão técnica (CBF, apps de gestão, etc.) */
export const STAFF_ROLES = [
  { value: "tecnico", label: "Técnico" },
  { value: "auxiliar_tecnico", label: "Auxiliar técnico" },
  { value: "treinador_goleiros", label: "Treinador de goleiros" },
  { value: "preparador_fisico", label: "Preparador físico" },
  { value: "medico", label: "Médico" },
  { value: "fisioterapeuta", label: "Fisioterapeuta" },
  { value: "fisiologista", label: "Fisiologista" },
  { value: "psicologo", label: "Psicólogo" },
  { value: "nutricionista", label: "Nutricionista" },
  { value: "analista_desempenho", label: "Analista de desempenho" },
  { value: "scout", label: "Scout" },
  { value: "massagista", label: "Massagista" },
  { value: "enfermeiro", label: "Enfermeiro" },
  { value: "outro", label: "Outro" },
] as const;

export const CONTRACT_TYPES = [
  { value: "CLT", label: "CLT" },
  { value: "PJ", label: "PJ" },
  { value: "estagio", label: "Estágio" },
  { value: "voluntario", label: "Voluntário" },
] as const;

export function getStaffRoleLabel(value: string): string {
  return STAFF_ROLES.find((r) => r.value === value)?.label ?? value;
}

/** Converte cargo cadastrado (slug ou texto RH) para slug canônico da comissão. */
export function normalizeStaffRoleSlug(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "outro";
  const byValue = STAFF_ROLES.find((r) => r.value === raw);
  if (byValue) return byValue.value;
  const norm = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  for (const r of STAFF_ROLES) {
    const label = r.label
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
    if (norm === label || norm.includes(label) || label.includes(norm)) return r.value;
  }
  if (norm.includes("auxiliar")) return "auxiliar_tecnico";
  if (norm.includes("goleir")) return "treinador_goleiros";
  if (norm.includes("preparador") || norm.includes("fisico")) return "preparador_fisico";
  if (norm.includes("tecnico") || norm.includes("treinador")) return "tecnico";
  return "outro";
}

export function getContractTypeLabel(value: string): string {
  return CONTRACT_TYPES.find((c) => c.value === value)?.label ?? value;
}
