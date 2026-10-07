export type VenueSpace = {
  id: string;
  venueSlug: string;
  name: string;
  slug: string;
  capacityStanding: number | null;
  capacitySeated: number | null;
  sortOrder: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type VenueBookingLeadSummary = {
  id: string;
  contactName: string;
  companyName: string | null;
  stage: string;
};

export type VenueBookingEventRef = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type VenueBookingEventPrefill = {
  bookingId: string;
  eligible: boolean;
  bookingStatus: string;
  existingEvent: VenueBookingEventRef | null;
  suggested: {
    name: string;
    slug: string;
    category: "football" | "other";
    organizer: "tenant";
    tenantId: string;
    startDate: string;
    endDate: string;
    locationLabel: string;
    description: string;
  };
};

export const EVENT_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

export type VenueBooking = {
  id: string;
  venueSlug: string;
  spaceId: string;
  spaceName?: string;
  title: string;
  eventType: string | null;
  startAt: string;
  endAt: string;
  status: string;
  pipelineLeadId: string | null;
  pipelineLead?: VenueBookingLeadSummary | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  guestCount: number | null;
  notes: string | null;
  event: VenueBookingEventRef | null;
  createdAt: string;
  updatedAt: string;
};

export type VenuePipelineLead = {
  id: string;
  venueSlug: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string | null;
  eventType: string | null;
  guestCount: number | null;
  preferredDate: string | null;
  message: string | null;
  stage: string;
  source: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: VenueBooking | null;
};

export type VenueOverviewChartPoint = {
  date: string;
  count: number;
};

export type VenueOverviewSourcePoint = {
  source: string;
  count: number;
};

export type VenueOverviewUpcomingBooking = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  eventType: string | null;
  guestCount: number | null;
  contactName: string | null;
  spaceName?: string;
};

export type VenueOverviewAttentionLead = {
  id: string;
  contactName: string;
  companyName: string | null;
  stage: string;
  source: string;
  updatedAt: string;
};

export type VenueFinanceOverviewKpis = {
  totalContracted: string;
  totalReceived: string;
  openBalance: string;
  overdueBalance: string;
  dueSoonBalance: string;
};

export type VenueOperationAlert = {
  code: string;
  label: string;
  severity: "info" | "warning" | "danger";
};

export type VenueOperationProposalRef = {
  id: string;
  proposalNumber: string;
  status: string;
  total: string;
};

export type VenueOperationContractRef = {
  id: string;
  contractNumber: string;
  status: string;
  total: string;
  signedAt: string | null;
};

export type VenueOperationLeadRef = {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string | null;
  stage: string;
};

export type VenueOperationListItem = {
  bookingId: string;
  event: VenueBookingEventRef | null;
  title: string;
  eventType: string | null;
  startAt: string;
  endAt: string;
  spaceId: string;
  spaceName: string;
  guestCount: number | null;
  bookingStatus: string;
  contactName: string | null;
  companyName: string | null;
  pipelineLeadId: string | null;
  proposal: VenueOperationProposalRef | null;
  contract: VenueOperationContractRef | null;
  finance: VenueReceivableSummary | null;
  receivableId: string | null;
  alerts: VenueOperationAlert[];
};

export type VenueOperationDetail = VenueOperationListItem & {
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  lead: VenueOperationLeadRef | null;
  proposals: VenueOperationProposalRef[];
  updatedAt: string;
};

export type VenueOperationUpcomingItem = Pick<
  VenueOperationListItem,
  | "bookingId"
  | "title"
  | "startAt"
  | "endAt"
  | "spaceName"
  | "contactName"
  | "companyName"
  | "bookingStatus"
  | "alerts"
>;

export type VenueOverview = {
  spacesCount: number;
  bookingsToday: number;
  upcomingBookingsTotal: number;
  bookingsThisMonth: number;
  confirmedUpcoming: number;
  pipelineByStage: Record<string, number>;
  leadsOpen: number;
  leadsTotal: number;
  leadsNewThisMonth: number;
  leadsWon: number;
  bookingsByStatus: Record<string, number>;
  leadsLast30Days: VenueOverviewChartPoint[];
  leadsBySource: VenueOverviewSourcePoint[];
  upcomingBookings: VenueOverviewUpcomingBooking[];
  leadsNeedingAttention: VenueOverviewAttentionLead[];
  finance?: VenueFinanceOverviewKpis;
  operationsUpcoming?: VenueOperationUpcomingItem[];
};

export const VENUE_PAYMENT_METHODS = [
  "cash",
  "check",
  "zelle",
  "card",
  "ach",
  "wire",
  "other",
] as const;

export const VENUE_PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  check: "Cheque",
  zelle: "Zelle",
  card: "Cartão",
  ach: "ACH",
  wire: "Wire",
  other: "Outro",
};

export type VenueReceivableSummary = {
  id: string;
  contractId: string;
  originalAmount: string;
  totalPaid: string;
  balance: string;
  status: string;
  nextDueDate: string | null;
  nextDueAmount: string | null;
};

export type VenueReceivablePayment = {
  id: string;
  installmentId: string;
  amount: string;
  paidAt: string;
  paymentMethod: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
};

export type VenueReceivableInstallment = {
  id: string;
  sequence: number;
  label: string | null;
  dueDate: string;
  amount: string;
  paidAmount: string;
  balance: string;
  status: string;
  notes: string | null;
  payments: VenueReceivablePayment[];
};

export type VenueReceivable = VenueReceivableSummary & {
  contractNumber: string;
  contactName: string;
  companyName: string | null;
  title: string;
  eventDate: string | null;
  bookingId: string | null;
  updatedAt: string;
  notes: string | null;
  cancelledAt: string | null;
  createdAt: string;
  installments: VenueReceivableInstallment[];
};

export const RECEIVABLE_STATUS_LABEL: Record<string, string> = {
  unpaid: "Em aberto",
  partial: "Parcial",
  paid: "Quitado",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

export const RECEIVABLE_STATUS_COLOR: Record<string, string> = {
  unpaid: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  partial: "bg-sky-500/15 text-sky-200 ring-sky-500/30",
  paid: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  overdue: "bg-red-500/15 text-red-200 ring-red-500/30",
  cancelled: "bg-muted text-muted-foreground ring-border",
};

export type VenueReceivableListItem = VenueReceivableSummary & {
  contractNumber: string;
  contactName: string;
  companyName: string | null;
  title: string;
  eventDate: string | null;
  bookingId: string | null;
  updatedAt: string;
};

export const INSTALLMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

export const LEAD_SOURCE_LABEL: Record<string, string> = {
  website: "Site",
  manual: "Manual",
};

export const PIPELINE_STAGE_CHART_COLOR: Record<string, string> = {
  lead: "#a78bfa",
  analise: "#60a5fa",
  proposta: "#fbbf24",
  contrato: "#34d399",
  confirmado: "#22c55e",
  perdido: "#94a3b8",
};

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  hold: "Pré-reserva",
  confirmed: "Confirmado",
  blocked: "Bloqueio",
  cancelled: "Cancelado",
};

export const PIPELINE_STAGE_LABEL: Record<string, string> = {
  lead: "Novo lead",
  analise: "Em análise",
  proposta: "Proposta enviada",
  contrato: "Contrato",
  confirmado: "Confirmado",
  perdido: "Perdido",
};

export const PIPELINE_STAGES = [
  "lead",
  "analise",
  "proposta",
  "contrato",
  "confirmado",
  "perdido",
] as const;

export const BOOKING_STATUSES = ["hold", "confirmed", "blocked", "cancelled"] as const;

export const VENUE_CATALOG_CATEGORIES = [
  "venue",
  "audio",
  "video",
  "lighting",
  "staffing",
  "security",
  "cleaning",
  "furniture",
  "catering",
  "other",
] as const;

export const VENUE_CATALOG_BILLING_UNITS = ["flat", "hour", "unit", "person", "day"] as const;

export const VENUE_CATALOG_CATEGORY_LABEL: Record<string, string> = {
  venue: "Venue",
  audio: "Áudio",
  video: "Vídeo",
  lighting: "Iluminação",
  staffing: "Equipe",
  security: "Segurança",
  cleaning: "Limpeza",
  furniture: "Mobiliário",
  catering: "Catering",
  other: "Outros",
};

export const VENUE_CATALOG_BILLING_UNIT_LABEL: Record<string, string> = {
  flat: "Valor fixo",
  hour: "Por hora",
  unit: "Por unidade",
  person: "Por pessoa",
  day: "Por dia",
};

export type VenueCatalogService = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  category: string;
  defaultPrice: string;
  billingUnit: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VenueCatalogPackageItem = {
  id: string;
  serviceId: string;
  serviceName: string;
  quantity: string;
};

export type VenueCatalogPackage = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  defaultPrice: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  items: VenueCatalogPackageItem[];
  itemsCount: number;
};

export function formatCatalogMoney(value: string): string {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const VENUE_PROPOSAL_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
] as const;

export const VENUE_PROPOSAL_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  accepted: "Aceita",
  rejected: "Rejeitada",
  expired: "Expirada",
  cancelled: "Cancelada",
};

export const VENUE_PROPOSAL_STATUS_COLOR: Record<string, string> = {
  draft: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  sent: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  accepted: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/25",
  expired: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};

export type VenueProposalItem = {
  id: string;
  sourceType: string;
  sourceServiceId: string | null;
  sourcePackageId: string | null;
  name: string;
  description: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  sortOrder: number;
};

export type VenueProposal = {
  id: string;
  tenantId: string;
  proposalNumber: string;
  contractId?: string | null;
  contractNumber?: string | null;
  pipelineLeadId: string | null;
  bookingId: string | null;
  status: string;
  title: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string | null;
  eventType: string | null;
  eventDate: string | null;
  guestCount: number | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  notes: string | null;
  terms: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
  items: VenueProposalItem[];
};

export function formatProposalDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export const VENUE_CONTRACT_STATUSES = [
  "draft",
  "sent",
  "signed",
  "cancelled",
  "expired",
] as const;

export const VENUE_CONTRACT_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  signed: "Assinado",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export const VENUE_CONTRACT_STATUS_COLOR: Record<string, string> = {
  draft: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  sent: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  signed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
  expired: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export type VenueContractItem = {
  id: string;
  sourceProposalItemId: string | null;
  name: string;
  description: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  sortOrder: number;
};

export type VenueContract = {
  id: string;
  tenantId: string;
  contractNumber: string;
  proposalId: string;
  proposalNumber: string;
  pipelineLeadId: string | null;
  bookingId: string | null;
  status: string;
  title: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string | null;
  eventType: string | null;
  eventDate: string | null;
  guestCount: number | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  notes: string | null;
  terms: string | null;
  validFrom: string | null;
  validUntil: string | null;
  sentAt: string | null;
  signedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
  items: VenueContractItem[];
  receivableId: string | null;
  financialSummary: VenueReceivableSummary | null;
};

export function parseProposalDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return y && m && day ? `${y}-${m}-${day}` : "";
}

export const BOOKING_STATUS_COLOR: Record<string, string> = {
  hold: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  confirmed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  blocked: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/25",
};
