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

export type EventTicketingSalesStatus =
  | "inactive"
  | "not_started"
  | "ended"
  | "sold_out"
  | "on_sale";

export const EVENT_TICKETING_SALES_STATUS_LABEL: Record<EventTicketingSalesStatus, string> = {
  inactive: "Inativo",
  not_started: "Venda não iniciada",
  ended: "Venda encerrada",
  sold_out: "Esgotado",
  on_sale: "Em venda",
};

export type EventTicketingEventListItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  ticketingEnabled: boolean;
};

export type EventTicketingCapacityHint = {
  configuredTotal: number;
  venueCapacityStanding: number | null;
  venueCapacitySeated: number | null;
  exceedsVenueCapacity: boolean;
  message: string | null;
};

export type EventTicketLot = {
  id: string;
  ticketTypeId: string;
  name: string;
  price: string;
  quantity: number;
  active: boolean;
  sortOrder: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
  sold: number;
  held: number;
  available: number;
  salesStatus: EventTicketingSalesStatus;
  isCurrentLot: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EventTicketType = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  price: string | null;
  quantity: number | null;
  purchaseLimit: number | null;
  active: boolean;
  sortOrder: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
  usesLots: boolean;
  currentPrice: string | null;
  capacity: number;
  sold: number;
  held: number;
  available: number;
  salesStatus: EventTicketingSalesStatus;
  lots: EventTicketLot[];
  createdAt: string;
  updatedAt: string;
};

export type EventTicketingDetail = {
  eventId: string;
  eventName: string;
  eventSlug: string;
  eventStatus: string;
  ticketingEnabled: boolean;
  currency: string;
  types: EventTicketType[];
  capacityHint: EventTicketingCapacityHint | null;
};

export type EventTicketOrderStatus = "pending" | "confirmed" | "cancelled" | "expired";

export const EVENT_TICKET_ORDER_STATUS_LABEL: Record<EventTicketOrderStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export type EventTicketOrderPaymentSummary = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  paidAt: string | null;
  manualReference: string | null;
  externalProviderLabel: string | null;
  expiresAt: string | null;
};

export type EventTicketOrderListItem = {
  id: string;
  orderNumber: string;
  eventId: string;
  eventName: string;
  customerName: string;
  customerEmail: string;
  total: string;
  currency: string;
  status: EventTicketOrderStatus;
  holdExpiresAt: string | null;
  itemsCount: number;
  createdAt: string;
};

export type EventTicketOrderItem = {
  id: string;
  ticketTypeId: string;
  ticketLotId: string | null;
  ticketTypeName: string;
  lotName: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

export type EventTicketIssued = {
  id: string;
  ticketCode: string;
  qrPayload: string;
  status: string;
  ticketTypeName: string;
  lotName: string | null;
  holderName: string;
  unitPrice: string;
  currency: string;
  issuedAt: string;
};

export const EVENT_TICKET_STATUS_LABEL: Record<string, string> = {
  valid: "Válido",
  used: "Utilizado",
  cancelled: "Cancelado",
};

export type EventTicketCheckinResult =
  | "accepted"
  | "already_used"
  | "cancelled"
  | "invalid"
  | "wrong_event";

export const EVENT_TICKET_CHECKIN_RESULT_LABEL: Record<EventTicketCheckinResult, string> = {
  accepted: "ACEITO",
  already_used: "JÁ UTILIZADO",
  cancelled: "CANCELADO",
  invalid: "INVÁLIDO",
  wrong_event: "OUTRO EVENTO",
};

export type EventTicketCheckinResponse = {
  result: EventTicketCheckinResult;
  checkinId: string;
  scannedAt: string;
  ticket: {
    id: string;
    ticketCode: string;
    ticketTypeName: string;
    lotName: string | null;
    holderName: string;
    status: string;
    usedAt: string | null;
    tableName?: string | null;
    seatLabel?: string | null;
    section?: string | null;
  } | null;
};

export const COMPLIMENTARY_REASON_OPTIONS = [
  { value: "guest", label: "Convidado" },
  { value: "sponsor", label: "Patrocinador" },
  { value: "staff", label: "Staff" },
  { value: "artist", label: "Artista" },
  { value: "partner", label: "Parceiro" },
  { value: "press", label: "Imprensa" },
  { value: "courtesy", label: "Cortesia" },
  { value: "other", label: "Outro" },
] as const;

export type EventTicketCheckinRecentItem = {
  id: string;
  result: EventTicketCheckinResult;
  ticketCode: string | null;
  ticketTypeName: string | null;
  holderName: string | null;
  stationLabel: string | null;
  createdAt: string;
};

export type EventTicketOrderDetail = {
  id: string;
  orderNumber: string;
  eventId: string;
  eventName: string;
  eventSlug: string;
  status: EventTicketOrderStatus;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerDocument: string | null;
  subtotal: string;
  discount: string;
  fees: string;
  total: string;
  currency: string;
  holdExpiresAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  payment: EventTicketOrderPaymentSummary | null;
  financeProjection: { id: string; status: string } | null;
  tickets: EventTicketIssued[];
  items: EventTicketOrderItem[];
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  authorized: "Autorizado",
  paid: "Pago",
  failed: "Falhou",
  cancelled: "Cancelado",
  expired: "Expirado",
  partially_refunded: "Reembolso parcial",
  refunded: "Reembolsado",
};

export function formatTicketingMoney(
  value: string | null | undefined,
  currency = "USD",
): string {
  if (value == null || value === "") return "—";
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return value;
  try {
    return n.toLocaleString("pt-BR", { style: "currency", currency });
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export type TicketReportOverview = {
  event: { id: string; name: string; startDate: string | null; endDate: string | null; status: string };
  ticketing: { enabled: boolean; currency: string; seatingEnabled: boolean };
  capacity: { configured: number; consumed: number; held: number; remaining: number; committed: number };
  orders: { total: number; confirmed: number; pending: number; cancelled: number; expired: number };
  sales: {
    grossAmount: string;
    currency: string;
    confirmedOrders: number;
    ticketsSold: number;
    averageOrderValue: string | null;
    averagePaidTicketValue: string | null;
  };
  tickets: {
    paidIssued: number;
    complimentaryIssued: number;
    activeIssued: number;
    checkedIn: number;
    noShow: number;
    paidNoShow: number;
    complimentaryNoShow: number;
    cancelled: number;
    occupancyPercent: number;
  };
  financeReconciliation: { confirmedOrdersWithProjection: number; note: string };
};

export type TicketReportSales = {
  currency: string;
  summary: {
    grossSales: string;
    confirmedOrders: number;
    ticketsSold: number;
    averageOrderValue: string | null;
    averagePaidTicketValue: string | null;
    pendingOrders: number;
    cancelledOrders: number;
  };
  byTicketType: {
    ticketTypeId: string;
    ticketTypeName: string;
    ticketsSold: number;
    revenue: string;
    averageUnitPrice: string | null;
  }[];
  byLot: {
    ticketLotId: string;
    lotName: string;
    ticketTypeName: string;
    ticketsSold: number;
    revenue: string;
  }[];
  salesOverTime: { date: string; orders: number; revenue: string }[];
};

export type TicketReportComplimentary = {
  currency: string;
  summary: {
    issued: number;
    active: number;
    cancelled: number;
    used: number;
    unused: number;
    faceValueTotal: string;
    faceValueLabel: string;
  };
  byReason: { reason: string; reasonLabel: string; issued: number; used: number; unused: number }[];
  byTicketType: {
    ticketTypeId: string;
    ticketTypeName: string;
    issued: number;
    used: number;
    faceValueTotal: string;
  }[];
};

export type TicketReportCapacity = {
  configuredCapacity: number;
  consumedTickets: number;
  activeHolds: number;
  committed: number;
  checkedIn: number;
  remaining: number;
  occupancyPercent: number;
  byTicketType: {
    ticketTypeId: string;
    ticketTypeName: string;
    capacity: number;
    sold: number;
    held: number;
    available: number;
    complimentary: number;
    issued: number;
    used: number;
  }[];
};

export type TicketReportCheckin = {
  summary: {
    byResult: Record<string, number>;
    acceptedAttempts: number;
    alreadyUsedAttempts: number;
    cancelledAttempts: number;
    invalidAttempts: number;
    wrongEventAttempts: number;
    uniqueCheckedInTickets: number;
  };
  byTicketType: { ticketTypeName: string; accepted: number; uniqueUsed: number }[];
  byAdmissionSource: { admissionSource: string; uniqueUsed: number }[];
  byStation: { stationLabel: string; attempts: number; accepted: number }[];
  byOperator: { operatorUserId: string | null; operatorLabel: string; accepted: number }[];
  checkinsOverTime: { date: string; accepted: number; rejected: number }[];
};

export type TicketReportTicketsPerformance = {
  currency: string;
  typeAndLotPerformance: {
    ticketTypeId: string;
    ticketTypeName: string;
    ticketLotId: string | null;
    lotName: string | null;
    capacity: number;
    sold: number;
    complimentary: number;
    issued: number;
    used: number;
    unused: number;
    cancelled: number;
    revenue: string;
    averagePaidUnitPrice: string | null;
    usagePercent: number;
  }[];
};

export type TicketReportSeating = {
  seatingEnabled: boolean;
  tablesConfigured: number;
  seatsConfigured: number;
  assignedSeats: number;
  unassignedSeats: number;
  usedAssignedSeats: number;
  unusedAssignedSeats: number;
  byTable: { tableId: string; tableName: string; capacity: number; assigned: number; used: number }[];
  bySection: { section: string; assigned: number; used: number }[];
};

export type BchEventFinancialRevenueLine = {
  amount: string | null;
  currency: string | null;
  applicable: boolean;
  notes?: string | null;
};

export type BchEventFinancialCompleteness = {
  ticketingConfigured: boolean;
  barCloseFinalized: boolean;
  barCostComplete: boolean;
  receivableLinked: boolean;
  financialProjectionPresent: boolean;
  physicalCountCompleted: boolean;
  venueContractLinked: boolean;
  resultComplete: boolean;
  multiCurrency: boolean;
  currencyMismatch: boolean;
};

export type BchEventFinancialCurrencyGroup = {
  currency: string;
  ticketingRevenue: string | null;
  barRevenue: string | null;
  venueRevenue: string | null;
  grossOperationalRevenue: string;
  knownOperationalCost: string;
  operationalResult: string;
  operationalMarginPct: string | null;
  marginIncomplete: boolean;
  collected: string;
  outstanding: string;
  overdue: string | null;
};

export type BchEventFinancialResult = {
  eventId: string;
  eventName: string;
  eventStatus: string;
  eventStartAt: string | null;
  currencyHint: string | null;
  revenue: {
    ticketing: BchEventFinancialRevenueLine & {
      ticketsSold: number;
      complimentaryCount: number;
      confirmedOrderCount: number;
    };
    bar: BchEventFinancialRevenueLine & {
      salesCount: number;
      estimatedCogs: string | null;
      estimatedGrossMargin: string | null;
      marginIncomplete: boolean;
      wasteLossSummary: { movementType: string; quantity: string }[];
      physicalDivergenceProducts: number;
    };
    venueContract: BchEventFinancialRevenueLine & {
      contractId: string | null;
      contractNumber: string | null;
      contractStatus: string | null;
    };
    otherCanonical: BchEventFinancialRevenueLine;
    grossOperationalRevenue: string | null;
  };
  collection: {
    ticketing: {
      applicable: boolean;
      invoicedOrReceivable: string | null;
      paid: string | null;
      outstanding: string | null;
      overdue: string | null;
      currency: string | null;
    };
    bar: {
      applicable: boolean;
      invoicedOrReceivable: string | null;
      paid: string | null;
      outstanding: string | null;
      overdue: string | null;
      currency: string | null;
    };
    venueReceivable: {
      applicable: boolean;
      invoicedOrReceivable: string | null;
      paid: string | null;
      outstanding: string | null;
      overdue: string | null;
      currency: string | null;
    };
    totalCollected: string | null;
    totalOutstanding: string | null;
  };
  cost: {
    barCogs: string | null;
    otherKnownOperationalCost: string | null;
    totalKnownOperationalCost: string | null;
  };
  result: {
    grossOperationalRevenue: string | null;
    knownOperationalCost: string | null;
    operationalResult: string | null;
    operationalMarginPct: string | null;
    marginIncomplete: boolean;
  };
  multiCurrency: boolean;
  currencyMismatch: boolean;
  consolidatedCurrency: string | null;
  currencies: BchEventFinancialCurrencyGroup[];
  financeiro: {
    projectionCount: number;
    projectionAmountInformative: string;
    note: string;
  };
  operationalKpis: {
    ticketsSold: number;
    attendance: number;
    complimentaryCount: number;
    barSalesCount: number;
    barRevenue: string | null;
    ticketRevenue: string | null;
    venueRevenue: string | null;
  };
  completeness: BchEventFinancialCompleteness;
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
