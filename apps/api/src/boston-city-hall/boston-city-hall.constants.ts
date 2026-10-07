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
  createdAt: string;
  updatedAt: string;
};

export type VenueBookingLeadSummary = {
  id: string;
  contactName: string;
  companyName: string | null;
  stage: string;
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
  pipelineLead?: VenueBookingLeadSummary | null;
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

export type VenueOverviewUpcomingBooking = Pick<
  VenueBookingDto,
  | 'id'
  | 'title'
  | 'startAt'
  | 'endAt'
  | 'status'
  | 'eventType'
  | 'guestCount'
  | 'contactName'
> & { spaceName?: string };

export type VenueOverviewAttentionLead = Pick<
  VenuePipelineLeadDto,
  'id' | 'contactName' | 'companyName' | 'stage' | 'source' | 'updatedAt'
>;

export type VenueFinanceOverviewKpis = {
  totalContracted: string;
  totalReceived: string;
  openBalance: string;
  overdueBalance: string;
  dueSoonBalance: string;
};

export type VenueOverviewDto = {
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

export const VENUE_CATALOG_CATEGORIES = [
  'venue',
  'audio',
  'video',
  'lighting',
  'staffing',
  'security',
  'cleaning',
  'furniture',
  'catering',
  'other',
] as const;

export type VenueCatalogCategory = (typeof VENUE_CATALOG_CATEGORIES)[number];

export const VENUE_CATALOG_BILLING_UNITS = ['flat', 'hour', 'unit', 'person', 'day'] as const;

export type VenueCatalogBillingUnit = (typeof VENUE_CATALOG_BILLING_UNITS)[number];

export const VENUE_CATALOG_CATEGORY_LABEL: Record<VenueCatalogCategory, string> = {
  venue: 'Venue',
  audio: 'Áudio',
  video: 'Vídeo',
  lighting: 'Iluminação',
  staffing: 'Equipe',
  security: 'Segurança',
  cleaning: 'Limpeza',
  furniture: 'Mobiliário',
  catering: 'Catering',
  other: 'Outros',
};

export const VENUE_CATALOG_BILLING_UNIT_LABEL: Record<VenueCatalogBillingUnit, string> = {
  flat: 'Valor fixo',
  hour: 'Por hora',
  unit: 'Por unidade',
  person: 'Por pessoa',
  day: 'Por dia',
};

export type VenueCatalogServiceDto = {
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

export type VenueCatalogPackageItemDto = {
  id: string;
  serviceId: string;
  serviceName: string;
  quantity: string;
};

export type VenueCatalogPackageDto = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  defaultPrice: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  items: VenueCatalogPackageItemDto[];
  itemsCount: number;
};

export const VENUE_PROPOSAL_STATUSES = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'cancelled',
] as const;

export type VenueProposalStatus = (typeof VENUE_PROPOSAL_STATUSES)[number];

export const VENUE_PROPOSAL_STATUS_LABEL: Record<VenueProposalStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  accepted: 'Aceita',
  rejected: 'Rejeitada',
  expired: 'Expirada',
  cancelled: 'Cancelada',
};

export const VENUE_PROPOSAL_ITEM_SOURCE_TYPES = ['service', 'package', 'custom'] as const;

export type VenueProposalItemSourceType = (typeof VENUE_PROPOSAL_ITEM_SOURCE_TYPES)[number];

export const BCH_PROPOSAL_NUMBER_PREFIX = 'BCH';

export type VenueProposalItemDto = {
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

export type VenueProposalListDto = {
  id: string;
  tenantId: string;
  proposalNumber: string;
  pipelineLeadId: string | null;
  bookingId: string | null;
  status: string;
  title: string;
  contactName: string;
  contactEmail: string;
  companyName: string | null;
  eventType: string | null;
  eventDate: string | null;
  guestCount: number | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
};

export type VenueProposalDto = VenueProposalListDto & {
  contactPhone: string | null;
  notes: string | null;
  terms: string | null;
  items: VenueProposalItemDto[];
  contractId: string | null;
  contractNumber: string | null;
};

export const VENUE_CONTRACT_STATUSES = [
  'draft',
  'sent',
  'signed',
  'cancelled',
  'expired',
] as const;

export type VenueContractStatus = (typeof VENUE_CONTRACT_STATUSES)[number];

export const VENUE_CONTRACT_STATUS_LABEL: Record<VenueContractStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  signed: 'Assinado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

export const BCH_CONTRACT_NUMBER_PREFIX = 'BCH-C';

export type VenueContractItemDto = {
  id: string;
  sourceProposalItemId: string | null;
  name: string;
  description: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  sortOrder: number;
};

export type VenueContractListDto = {
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
  companyName: string | null;
  eventType: string | null;
  eventDate: string | null;
  guestCount: number | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  sentAt: string | null;
  signedAt: string | null;
  updatedAt: string;
  itemsCount: number;
};

export type VenueContractDto = VenueContractListDto & {
  contactPhone: string | null;
  notes: string | null;
  terms: string | null;
  validFrom: string | null;
  validUntil: string | null;
  cancelledAt: string | null;
  createdAt: string;
  items: VenueContractItemDto[];
  receivableId: string | null;
  financialSummary: VenueReceivableSummaryDto | null;
};

export const VENUE_PAYMENT_METHODS = [
  'cash',
  'check',
  'zelle',
  'card',
  'ach',
  'wire',
  'other',
] as const;

export type VenuePaymentMethod = (typeof VENUE_PAYMENT_METHODS)[number];

export const VENUE_PAYMENT_METHOD_LABEL: Record<VenuePaymentMethod, string> = {
  cash: 'Dinheiro',
  check: 'Cheque',
  zelle: 'Zelle',
  card: 'Cartão',
  ach: 'ACH',
  wire: 'Wire',
  other: 'Outro',
};

export type VenueInstallmentComputedStatus =
  | 'pending'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type VenueReceivableComputedStatus =
  | 'unpaid'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type VenueReceivablePaymentDto = {
  id: string;
  installmentId: string;
  amount: string;
  paidAt: string;
  paymentMethod: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
};

export type VenueReceivableInstallmentDto = {
  id: string;
  sequence: number;
  label: string | null;
  dueDate: string;
  amount: string;
  paidAmount: string;
  balance: string;
  status: VenueInstallmentComputedStatus;
  notes: string | null;
  payments: VenueReceivablePaymentDto[];
};

export type VenueReceivableSummaryDto = {
  id: string;
  contractId: string;
  originalAmount: string;
  totalPaid: string;
  balance: string;
  status: VenueReceivableComputedStatus;
  nextDueDate: string | null;
  nextDueAmount: string | null;
};

export type VenueReceivableListDto = VenueReceivableSummaryDto & {
  contractNumber: string;
  contactName: string;
  companyName: string | null;
  title: string;
  eventDate: string | null;
  bookingId: string | null;
  updatedAt: string;
};

export type VenueReceivableDetailDto = VenueReceivableListDto & {
  notes: string | null;
  cancelledAt: string | null;
  createdAt: string;
  installments: VenueReceivableInstallmentDto[];
};
