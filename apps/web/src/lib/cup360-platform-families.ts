/** Famílias exibidas na administração de Funções (sem expor RBAC interno). */
export const CUP360_PLATFORM_FAMILIES: { value: string; label: string }[] = [
  { value: "futebol", label: "Futebol" },
  { value: "saude", label: "Saúde" },
  { value: "gestao", label: "Gestão" },
  { value: "comunicacao", label: "Comunicação" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "desenvolvimento", label: "Desenvolvimento" },
  { value: "sistema", label: "Sistema" },
  { value: "outros", label: "Outros" },
];

export function platformFamilyLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return CUP360_PLATFORM_FAMILIES.find((f) => f.value === value)?.label ?? value;
}
