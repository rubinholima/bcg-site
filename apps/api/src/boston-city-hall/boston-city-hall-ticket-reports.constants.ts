export type TicketReportQueryDto = {
  eventId: string;
  dateFrom?: string;
  dateTo?: string;
  ticketTypeId?: string;
  ticketLotId?: string;
  admissionSource?: 'paid_order' | 'complimentary';
  ticketStatus?: string;
  complimentaryReason?: string;
  stationLabel?: string;
  operatorUserId?: string;
};

export type TicketReportOverviewDto = {
  event: {
    id: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    status: string;
  };
  ticketing: {
    enabled: boolean;
    currency: string;
    seatingEnabled: boolean;
  };
  capacity: {
    configured: number;
    consumed: number;
    held: number;
    remaining: number;
    committed: number;
  };
  orders: {
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    expired: number;
  };
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
  financeReconciliation: {
    confirmedOrdersWithProjection: number;
    note: string;
  };
};

export type TicketReportSalesDto = {
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

export type TicketReportComplimentaryDto = {
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

export type TicketReportCapacityDto = {
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

export type TicketReportCheckinDto = {
  summary: ReturnType<
    typeof import('./boston-city-hall-ticket-reports.util').aggregateCheckinResults
  > & { uniqueCheckedInTickets: number };
  byTicketType: { ticketTypeName: string; accepted: number; uniqueUsed: number }[];
  byAdmissionSource: { admissionSource: string; uniqueUsed: number }[];
  byStation: { stationLabel: string; attempts: number; accepted: number }[];
  byOperator: { operatorUserId: string | null; operatorLabel: string; accepted: number }[];
  checkinsOverTime: { date: string; accepted: number; rejected: number }[];
};

export type TicketReportSeatingDto = {
  seatingEnabled: boolean;
  tablesConfigured: number;
  seatsConfigured: number;
  assignedSeats: number;
  unassignedSeats: number;
  usedAssignedSeats: number;
  unusedAssignedSeats: number;
  byTable: {
    tableId: string;
    tableName: string;
    capacity: number;
    assigned: number;
    used: number;
  }[];
  bySection: { section: string; assigned: number; used: number }[];
};

export type TicketTypeLotPerformanceRow = {
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
};

export type TicketReportTicketsDto = {
  currency: string;
  typeAndLotPerformance: TicketTypeLotPerformanceRow[];
};
