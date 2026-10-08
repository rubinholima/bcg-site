import type { BchEventFinancialCurrencyGroupDto } from './boston-city-hall-event-financial.constants';
import type { BchEventExecutiveSummaryDto } from './boston-city-hall-event-financial.constants';
import type { BchAlertSummaryCountsDto, BchOperationalAlertDto } from './boston-city-hall-operational-alert.constants';

export const BCH_EXECUTIVE_ATTENTION_CODES = [
  'overdue_receivable',
  'incomplete_financial_data',
  'bar_not_closed',
  'no_physical_count',
  'margin_incomplete',
  'ticketing_pending',
  'event_without_contract',
] as const;

export type BchExecutiveAttentionCode = (typeof BCH_EXECUTIVE_ATTENTION_CODES)[number];

export type BchExecutivePeriodDto = {
  preset: 'today' | 'this_week' | 'this_month' | 'custom';
  from: string;
  to: string;
};

export type BchExecutiveCurrencyTotalsDto = BchEventFinancialCurrencyGroupDto;

export type BchExecutiveRevenueMixSliceDto = {
  currency: string;
  ticketing: string;
  bar: string;
  venue: string;
  total: string;
};

export type BchExecutiveRevenueTrendPointDto = {
  date: string;
  currency: string;
  grossOperationalRevenue: string;
  attendance: number;
};

export type BchExecutiveAttentionItemDto = {
  eventId: string;
  eventName: string;
  eventStartAt: string | null;
  alerts: BchOperationalAlertDto[];
};

export type BchExecutiveSummaryResponseDto = {
  period: BchExecutivePeriodDto;
  multiCurrency: boolean;
  currencyMismatch: boolean;
  currencies: BchExecutiveCurrencyTotalsDto[];
  events: {
    inPeriod: number;
    upcoming: number;
    pastInPeriod: number;
    activeOperational: number;
  };
  ticketing: {
    confirmedOrderCount: number;
    ticketsSold: number;
    complimentaryCount: number;
    attendance: number;
    attendanceRatePct: string | null;
    revenueByCurrency: Array<{ currency: string; amount: string }>;
  };
  bar: {
    completedSalesCount: number;
    revenueByCurrency: Array<{ currency: string; amount: string }>;
    knownCogsByCurrency: Array<{ currency: string; amount: string }>;
    grossMarginByCurrency: Array<{ currency: string; amount: string; marginPct: string | null }>;
    wasteLossEventCount: number;
    physicalDivergenceEventCount: number;
    barClosePendingEventCount: number;
  };
  collection: {
    byCurrency: Array<{
      currency: string;
      receivable: string;
      collected: string;
      outstanding: string;
      overdue: string | null;
    }>;
    overdueEventCount: number;
  };
  result: {
    byCurrency: Array<{
      currency: string;
      grossOperationalRevenue: string;
      knownOperationalCost: string;
      operationalResult: string;
      operationalMarginPct: string | null;
      marginIncomplete: boolean;
    }>;
    incompleteResultEventCount: number;
  };
  revenueMix: BchExecutiveRevenueMixSliceDto[];
  revenueTrend: BchExecutiveRevenueTrendPointDto[];
  attentionRequired: BchExecutiveAttentionItemDto[];
  alertSummary: BchAlertSummaryCountsDto;
  upcomingEvents: BchExecutiveCompactEventDto[];
  recentEvents: BchExecutiveCompactEventDto[];
};

export type BchExecutiveCompactEventDto = {
  eventId: string;
  eventName: string;
  eventStatus: string;
  eventStartAt: string | null;
  spaceName: string | null;
  bookingId: string | null;
  bookingStatus: string | null;
  ticketingEnabled: boolean;
  ticketsSold: number;
  attendance: number;
  currencies: BchEventFinancialCurrencyGroupDto[];
  multiCurrency: boolean;
  attentionFlags: BchExecutiveAttentionCode[];
  resultComplete: boolean;
};

export type BchExecutiveEventPerformanceRowDto = {
  eventId: string;
  eventName: string;
  eventStatus: string;
  eventStartAt: string | null;
  bookingId: string | null;
  bookingStatus: string | null;
  spaceName: string | null;
  ticketingEnabled: boolean;
  ticketingStatusNote: string | null;
  ticketsSold: number;
  attendance: number;
  attendanceRatePct: string | null;
  complimentaryCount: number;
  ticketRevenue: string | null;
  ticketRevenueCurrency: string | null;
  barRevenue: string | null;
  barSalesCount: number;
  venueRevenue: string | null;
  collected: string | null;
  outstanding: string | null;
  knownCost: string | null;
  operationalResult: string | null;
  operationalMarginPct: string | null;
  multiCurrency: boolean;
  currencies: BchEventFinancialCurrencyGroupDto[];
  consolidatedCurrency: string | null;
  marginIncomplete: boolean;
  resultComplete: boolean;
  attentionFlags: BchExecutiveAttentionCode[];
  activeAlerts: BchOperationalAlertDto[];
  inventoryDivergenceProducts: number;
  summary: BchEventExecutiveSummaryDto;
};

export type BchExecutiveEventsResponseDto = {
  period: BchExecutivePeriodDto;
  total: number;
  items: BchExecutiveEventPerformanceRowDto[];
  comparisonByCurrency: Array<{
    currency: string;
    topByRevenue: Array<{ eventId: string; eventName: string; grossOperationalRevenue: string }>;
    topByAttendance: Array<{ eventId: string; eventName: string; attendance: number }>;
  }>;
};

export type BchExecutiveEventsQuery = {
  period?: string;
  from?: string;
  to?: string;
  status?: string;
  financialComplete?: 'true' | 'false';
  search?: string;
};
