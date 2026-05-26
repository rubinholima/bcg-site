/**
 * Tipos de modelo de contrato (Jurídico) — cada PDF pode ter campos diferentes.
 * O `type` do modelo é usado para sugerir/filtrar no vínculo RH (CLT, PJ, estágio…).
 */
export const CONTRACT_TEMPLATE_TYPES = [
  { value: "CLT", label: "CLT — funcionário" },
  { value: "contrato_trabalho", label: "Contrato de trabalho (CLT genérico)" },
  { value: "PJ", label: "PJ — prestador de serviço" },
  { value: "estagio", label: "Estágio" },
  { value: "temporario", label: "Temporário" },
  { value: "atleta", label: "Contrato de atleta" },
  { value: "formacao", label: "Contrato de formação" },
  { value: "contrato_imagem", label: "Contrato de imagem / direito de arena" },
  { value: "dirigente", label: "Dirigente / gestão" },
  { value: "aditivo", label: "Aditivo contratual" },
  { value: "rescisao", label: "Termo de rescisão" },
  { value: "transferencia", label: "Termo de transferência" },
  { value: "procuracao", label: "Procuração" },
  { value: "nda", label: "NDA / confidencialidade" },
  { value: "outro", label: "Outro (qualquer vínculo)" },
] as const;

export type ContractTemplateType = (typeof CONTRACT_TEMPLATE_TYPES)[number]["value"];

export const CONTRACT_TEMPLATE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CONTRACT_TEMPLATE_TYPES.map((t) => [t.value, t.label]),
);

/** Tipos de modelo compatíveis com cada `employment.contractType` do RH. */
const EMPLOYMENT_TO_TEMPLATE_TYPES: Record<string, string[]> = {
  CLT: ["CLT", "contrato_trabalho", "aditivo", "rescisao", "outro"],
  PJ: ["PJ", "aditivo", "rescisao", "nda", "outro"],
  estagio: ["estagio", "aditivo", "rescisao", "outro"],
  atleta: ["atleta", "formacao", "contrato_imagem", "transferencia", "aditivo", "rescisao", "outro"],
};

export function templateMatchesEmploymentContractType(
  templateType: string,
  employmentContractType: string,
): boolean {
  const tt = templateType.trim().toLowerCase();
  if (tt === "outro") return true;
  const ct = employmentContractType.trim().toLowerCase();
  if (tt === ct) return true;
  const allowed = EMPLOYMENT_TO_TEMPLATE_TYPES[ct] ?? EMPLOYMENT_TO_TEMPLATE_TYPES[ct.toUpperCase()];
  if (allowed?.some((a) => a.toLowerCase() === tt)) return true;
  return false;
}

export function filterTemplatesForEmployment<T extends { type: string; active?: boolean }>(
  templates: T[],
  employmentContractType: string,
): T[] {
  return templates.filter(
    (t) => t.active !== false && templateMatchesEmploymentContractType(t.type, employmentContractType),
  );
}
