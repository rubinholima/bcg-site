export const PHYSIO_PERIODIC_PROTOCOL_LABEL: Record<string, string> = {
  y_balance: "Y Balance",
  t_test: "T Test",
  stop_down: "Stop Down",
  hop_test: "Hop Test",
  perimetria: "Perimetria",
  agachamento_bastao: "Agachamento com bastão",
  forca_kinology: "Força / Kinology",
};

export const PHYSIO_PROTOCOL_CLASSIFICATION_LABEL: Record<string, string> = {
  aprovado: "Aprovado",
  aceitavel: "Aceitável",
  reprovado: "Reprovado",
  medio: "Médio",
  ruim: "Ruim",
  bom: "Bom",
  razoavel: "Razoável",
};

export type PhysioClearanceOperationalStatus = "pendente" | "aprovado" | "reprovado";

export function labelForPhysioClearanceStatus(status?: PhysioClearanceOperationalStatus | null): string {
  switch (status) {
    case "aprovado":
      return "Aprovado";
    case "reprovado":
      return "Reprovado";
    default:
      return "Pendente";
  }
}

export function physioClearanceBadgeClass(status?: PhysioClearanceOperationalStatus | null): string {
  switch (status) {
    case "aprovado":
      return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
    case "reprovado":
      return "border-destructive/50 bg-destructive/10 text-destructive";
    default:
      return "border-amber-500/50 bg-amber-500/10 text-amber-300";
  }
}
