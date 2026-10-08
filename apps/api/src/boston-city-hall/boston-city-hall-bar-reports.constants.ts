export type BchBarReportPeriodQuery = {
  from?: string;
  to?: string;
  eventId?: string;
  locationId?: string;
  productId?: string;
  sellingUnitId?: string;
  operatorUserId?: string;
  paymentMethod?: string;
  status?: string;
};

export type BchBarDashboardDto = {
  periodFrom: string;
  periodTo: string;
  salesCount: number;
  revenue: string;
  estimatedCogs: string;
  estimatedGrossMargin: string;
  estimatedGrossMarginPct: string | null;
  itemsSold: string;
  lowStockProducts: number;
  outOfStockProducts: number;
  openContainers: number;
  activeEventInventories: number;
  recentDivergenceProducts: number;
  marginIncomplete: boolean;
};

export type BchBarSalesReportDto = {
  salesCount: number;
  unitsSold: string;
  grossSales: string;
  discountTotal: string;
  netSales: string;
  averageTicket: string;
  estimatedCogs: string;
  estimatedGrossMargin: string;
  marginIncomplete: boolean;
};

export type BchBarProductPerformanceRow = {
  productId: string;
  productName: string;
  sellingUnitId: string;
  sellingUnitName: string;
  quantitySold: string;
  revenue: string;
  expectedCost: string;
  grossMargin: string;
  grossMarginPct: string | null;
  complimentaryQty: string;
  wasteQty: string;
  marginIncomplete: boolean;
};

export type BchBarPaymentMethodRow = {
  method: string;
  methodLabel: string;
  count: number;
  totalAmount: string;
};
