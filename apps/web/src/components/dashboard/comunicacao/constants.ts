/** Select nativo dentro de Dialog (Radix Select quebra no modal). */
export const NATIVE_SELECT_CLASS =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full min-w-0 min-h-[44px]";

/** Áreas / departamentos dentro da unidade (empresa/clube). */
export const COMMUNICATION_DEPARTMENTS = [
  { value: "comercial", label: "Comercial" },
  { value: "marketing", label: "Marketing" },
  { value: "midia", label: "Mídia" },
  { value: "financeiro", label: "Financeiro" },
  { value: "administracao", label: "Administração" },
  { value: "atendimento", label: "Atendimento" },
  { value: "eventos", label: "Eventos / Boston City Hall" },
  { value: "futebol", label: "Futebol" },
  { value: "outro", label: "Outro (personalizado)" },
] as const;
