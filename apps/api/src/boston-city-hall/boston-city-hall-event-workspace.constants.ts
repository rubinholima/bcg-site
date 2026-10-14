import type { VenueOperationListItemDto } from './boston-city-hall.constants';

export type BchEventWorkspaceReadinessItemDto = {
  code: string;
  ok: boolean;
  label: string;
  detail?: string | null;
};

export type BchEventWorkspaceTicketKpisDto = {
  applicable: boolean;
  enabled: boolean;
  currency: string | null;
  ticketsSold: number;
  capacityConfigured: number | null;
  checkedIn: number;
  grossAmount: string | null;
};

export type BchEventWorkspaceEventDto = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  organizer: string;
  category: string;
  logoUrl: string | null;
  /** ISO 8601 — horário completo quando existir no banco */
  startAt: string | null;
  endAt: string | null;
  /** Compatibilidade legada (YYYY-MM-DD) */
  startDate: string | null;
  endDate: string | null;
  locationLabel: string | null;
  venueSpaceId: string | null;
  venueSpaceName: string | null;
  content: unknown;
};

export type BchEventWorkspaceDto = {
  event: BchEventWorkspaceEventDto;
  booking: VenueOperationListItemDto | null;
  ticketing: {
    enabled: boolean;
    currency: string | null;
    typesActiveCount: number;
    salesOpen: boolean;
  };
  ticketKpis: BchEventWorkspaceTicketKpisDto;
  readiness: BchEventWorkspaceReadinessItemDto[];
  operationalStage: 'planejamento' | 'preparacao' | 'execucao' | 'fechamento';
  alertOpenCount: number;
};
