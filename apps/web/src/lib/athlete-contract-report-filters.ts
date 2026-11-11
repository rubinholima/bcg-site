import { REPORT_PRESETS } from "@/lib/athlete-contract-hub";

export type AthleteContractReportFilterState = {
  playerId: string;
  category: string;
  contractTypeId: string;
  status: string;
  federativeStatus: string;
  athleteSegment: "" | "professional" | "formation";
  clubName: string;
  partnerClubName: string;
  agentName: string;
  responsibleUserId: string;
  signatureStatus: string;
  startDateFrom: string;
  startDateTo: string;
  endDateFrom: string;
  endDateTo: string;
  expirationWindowDays: string;
  financialPending: boolean;
};

export const EMPTY_ATHLETE_CONTRACT_REPORT_FILTERS: AthleteContractReportFilterState = {
  playerId: "",
  category: "",
  contractTypeId: "",
  status: "",
  federativeStatus: "",
  athleteSegment: "",
  clubName: "",
  partnerClubName: "",
  agentName: "",
  responsibleUserId: "",
  signatureStatus: "",
  startDateFrom: "",
  startDateTo: "",
  endDateFrom: "",
  endDateTo: "",
  expirationWindowDays: "",
  financialPending: false,
};

const CONTRACT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "EXPIRING",
  "PENDING_SIGNATURE",
  "EXPIRED",
  "ARCHIVED",
  "TERMINATED",
  "CANCELLED",
] as const;

export const FEDERATIVE_STATUS_OPTIONS = [
  "PENDENTE",
  "DOCUMENTOS_PENDENTES",
  "DOCUMENTOS_OK",
  "EM_REGISTRO",
  "AGUARDANDO_ASSINATURA",
  "AGUARDANDO_TAXAS",
  "CONCLUIDO",
  "REJEITADO",
  "CANCELADO",
] as const;

export { CONTRACT_STATUSES };

/** Monta o body do POST /athlete-contracts/report — sem lógica de filtragem (só serialização). */
export function buildAthleteContractReportBody(
  presetId: string,
  filters: AthleteContractReportFilterState,
  paging: { sortBy: string; sortDir: "asc" | "desc"; offset: number; limit: number },
): Record<string, unknown> {
  const presetDef = REPORT_PRESETS.find((p) => p.id === presetId) ?? REPORT_PRESETS[0];
  const body: Record<string, unknown> = {
    ...presetDef,
    sortBy: paging.sortBy,
    sortDir: paging.sortDir,
    offset: paging.offset,
    limit: paging.limit,
  };

  if (filters.playerId.trim()) body.playerId = filters.playerId.trim();
  if (filters.category.trim()) body.category = filters.category.trim();
  if (filters.contractTypeId.trim()) body.contractTypeId = filters.contractTypeId.trim();
  if (filters.status.trim()) body.status = filters.status.trim();
  if (filters.federativeStatus.trim()) body.federativeStatus = filters.federativeStatus.trim();
  if (filters.athleteSegment) body.athleteSegment = filters.athleteSegment;
  if (filters.clubName.trim()) body.clubName = filters.clubName.trim();
  if (filters.partnerClubName.trim()) body.partnerClubName = filters.partnerClubName.trim();
  if (filters.agentName.trim()) body.agentName = filters.agentName.trim();
  if (filters.responsibleUserId.trim()) body.responsibleUserId = filters.responsibleUserId.trim();
  if (filters.signatureStatus.trim()) body.signatureStatus = filters.signatureStatus.trim();
  if (filters.startDateFrom) body.startDateFrom = filters.startDateFrom;
  if (filters.startDateTo) body.startDateTo = filters.startDateTo;
  if (filters.endDateFrom) body.endDateFrom = filters.endDateFrom;
  if (filters.endDateTo) body.endDateTo = filters.endDateTo;
  if (filters.expirationWindowDays.trim()) {
    const n = Number(filters.expirationWindowDays);
    if (Number.isFinite(n) && n > 0) body.expirationWindowDays = n;
  }
  if (filters.financialPending) body.financialPending = true;

  return body;
}

export function hasActiveReportFilters(filters: AthleteContractReportFilterState): boolean {
  return Object.entries(filters).some(([k, v]) => {
    if (k === "financialPending") return v === true;
    return typeof v === "string" && v.trim() !== "";
  });
}
