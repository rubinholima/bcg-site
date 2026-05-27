export const BCH_VENUE_SLUG = 'boston-city-hall';

export const VENUE_BOOKING_STATUSES = [
  'hold',
  'confirmed',
  'blocked',
  'cancelled',
] as const;

export const VENUE_PIPELINE_STAGES = [
  'lead',
  'analise',
  'proposta',
  'contrato',
  'confirmado',
  'perdido',
] as const;

export type VenueBookingStatus = (typeof VENUE_BOOKING_STATUSES)[number];
export type VenuePipelineStage = (typeof VENUE_PIPELINE_STAGES)[number];

export const BOOKING_STATUS_LABEL: Record<VenueBookingStatus, string> = {
  hold: 'Pré-reserva',
  confirmed: 'Confirmado',
  blocked: 'Bloqueio',
  cancelled: 'Cancelado',
};

export const PIPELINE_STAGE_LABEL: Record<VenuePipelineStage, string> = {
  lead: 'Novo lead',
  analise: 'Em análise',
  proposta: 'Proposta enviada',
  contrato: 'Contrato',
  confirmado: 'Confirmado',
  perdido: 'Perdido',
};

export type VenueSpaceDto = {
  id: string;
  venueSlug: string;
  name: string;
  slug: string;
  capacityStanding: number | null;
  capacitySeated: number | null;
  sortOrder: number;
  active: boolean;
};

export type VenueBookingDto = {
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

export type VenuePipelineLeadDto = {
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
  booking?: VenueBookingDto | null;
};

export type VenueOverviewChartPoint = {
  date: string;
  count: number;
};

export type VenueOverviewSourcePoint = {
  source: string;
  count: number;
};

export type VenueOverviewDto = {
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

export const DEFAULT_VENUE_SPACES: Array<{
  name: string;
  slug: string;
  capacityStanding?: number;
  capacitySeated?: number;
  sortOrder: number;
}> = [
  { name: 'Salão principal', slug: 'salao-principal', capacityStanding: 800, capacitySeated: 350, sortOrder: 0 },
  { name: 'Lounge VIP', slug: 'lounge-vip', capacityStanding: 350, capacitySeated: 250, sortOrder: 1 },
  { name: 'Espaço corporativo', slug: 'espaco-corporativo', capacityStanding: 120, capacitySeated: 80, sortOrder: 2 },
  { name: 'Zona de experiência', slug: 'zona-experiencia', capacityStanding: 60, sortOrder: 3 },
  { name: 'Anéis de circulação', slug: 'aneis-circulacao', capacityStanding: 2000, sortOrder: 4 },
];
