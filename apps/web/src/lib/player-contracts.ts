export interface PlayerEconomicRight {
  id: string;
  clubName: string;
  percentage: number;
}

export interface PlayerContractRow {
  id: string;
  source: "juridico" | "rh" | "beatscode";
  displayId: string;
  startDate: string | null;
  endDate: string | null;
  economicRightsClub: string | null;
  status: string;
  contractType: string;
  destinationClub: string | null;
  executionPercent: number | null;
  juridicoDocumentId?: string;
  rhEmploymentId?: string;
  fileUrl?: string | null;
  beatscodeContractId?: number;
}

export interface PlayerContractsOverview {
  economicRights: PlayerEconomicRight[];
  contracts: PlayerContractRow[];
  tenantName: string;
}

export const LEGAL_CONTRACT_TYPE_LABELS: Record<string, string> = {
  contrato_trabalho: "Contrato de trabalho",
  contrato_imagem: "Contrato de imagem",
  formacao: "Contrato de formação",
  rescisao: "Termo de rescisão",
  transferencia: "Termo de transferência",
  aditivo: "Aditivo contratual",
  procuração: "Procuração",
  nda: "NDA / Confidencialidade",
  outro: "Outro",
};

export const RH_CONTRACT_TYPE_LABELS: Record<string, string> = {
  CLT: "CLT",
  PJ: "PJ",
  estagio: "Estágio",
  atleta: "Contrato de atleta",
};

export const LEGAL_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_signature: "Aguardando assinatura",
  signed: "Ativo",
  expired: "Expirado",
  cancelled: "Cancelado",
};

export const RH_STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  afastado: "Afastado",
  desligado: "Encerrado",
};

export function formatContractDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function computeExecutionPercent(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  const now = Date.now();
  const total = end.getTime() - start.getTime();
  const elapsed = Math.min(Math.max(now - start.getTime(), 0), total);
  return Math.round((elapsed / total) * 100);
}

export function displayContractId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return String((hash % 9000) + 100);
}
