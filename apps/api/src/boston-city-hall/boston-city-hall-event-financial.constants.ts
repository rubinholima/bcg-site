/** Regras de propriedade canônica — projeções Financeiro não entram em receita operacional. */
export const BCH_EVENT_FINANCIAL_REVENUE_OWNERS = {
  ticketing: 'EventTicketOrder.status=confirmed',
  bar: 'BchBarSale.status=completed',
  venueContract: 'VenueContract.status=signed',
  financeiroProjection: 'FinanceiroLancamento.ownershipKind=projection (referência only)',
} as const;

export type BchEventFinancialCompletenessDto = {
  ticketingConfigured: boolean;
  barCloseFinalized: boolean;
  barCostComplete: boolean;
  receivableLinked: boolean;
  financialProjectionPresent: boolean;
  physicalCountCompleted: boolean;
  venueContractLinked: boolean;
  resultComplete: boolean;
};

export type BchEventFinancialRevenueLineDto = {
  amount: string | null;
  currency: string | null;
  /** false quando o domínio não se aplica ou falta vínculo — não confundir com zero. */
  applicable: boolean;
  notes?: string | null;
};

export type BchEventFinancialCollectionDto = {
  invoicedOrReceivable: string | null;
  paid: string | null;
  outstanding: string | null;
  overdue: string | null;
  currency: string | null;
  applicable: boolean;
};

export type BchEventFinancialResultDto = {
  eventId: string;
  eventName: string;
  eventStatus: string;
  eventStartAt: string | null;
  currencyHint: string | null;

  revenue: {
    ticketing: BchEventFinancialRevenueLineDto & {
      ticketsSold: number;
      complimentaryCount: number;
      confirmedOrderCount: number;
    };
    bar: BchEventFinancialRevenueLineDto & {
      salesCount: number;
      estimatedCogs: string | null;
      estimatedGrossMargin: string | null;
      marginIncomplete: boolean;
      wasteLossSummary: { movementType: string; quantity: string }[];
      physicalDivergenceProducts: number;
    };
    venueContract: BchEventFinancialRevenueLineDto & {
      contractId: string | null;
      contractNumber: string | null;
      contractStatus: string | null;
    };
    otherCanonical: BchEventFinancialRevenueLineDto;
    grossOperationalRevenue: string;
  };

  collection: {
    ticketing: BchEventFinancialCollectionDto;
    bar: BchEventFinancialCollectionDto;
    venueReceivable: BchEventFinancialCollectionDto;
    totalCollected: string;
    totalOutstanding: string;
  };

  cost: {
    barCogs: string | null;
    otherKnownOperationalCost: string | null;
    totalKnownOperationalCost: string;
  };

  result: {
    grossOperationalRevenue: string;
    knownOperationalCost: string;
    operationalResult: string;
    operationalMarginPct: string | null;
    marginIncomplete: boolean;
  };

  financeiro: {
    projectionCount: number;
    /** Valor informativo — já espelhado nos domínios; não somar em receita. */
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

  completeness: BchEventFinancialCompletenessDto;
  revenueOwnership: typeof BCH_EVENT_FINANCIAL_REVENUE_OWNERS;
};

export type BchEventExecutiveSummaryDto = {
  eventId: string;
  eventName: string;
  eventStatus: string;
  eventStartAt: string | null;
  ticketRevenue: string | null;
  barRevenue: string | null;
  venueRevenue: string | null;
  totalOperationalRevenue: string;
  collected: string;
  outstanding: string;
  knownCosts: string;
  operationalResult: string;
  operationalMarginPct: string | null;
  marginIncomplete: boolean;
  ticketsSold: number;
  attendance: number;
  barSalesCount: number;
  inventoryDivergenceProducts: number;
  completeness: BchEventFinancialCompletenessDto;
};
