export type VenueSpace = {
  id: string;
  venueSlug: string;
  name: string;
  slug: string;
  capacityStanding: number | null;
  capacitySeated: number | null;
  sortOrder: number;
  active: boolean;
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

export type VenueOverview = {
  spacesCount: number;
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

export const BOOKING_STATUS_COLOR: Record<string, string> = {
  hold: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  confirmed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  blocked: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/25",
};
