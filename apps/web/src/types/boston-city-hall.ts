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
