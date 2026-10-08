export const BCH_ALERT_STATUSES = ['open', 'acknowledged', 'resolved'] as const;
export type BchAlertStatus = (typeof BCH_ALERT_STATUSES)[number];

export const BCH_ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type BchAlertSeverity = (typeof BCH_ALERT_SEVERITIES)[number];

export const BCH_ALERT_TYPES = [
  'overdue_receivable',
  'event_without_signed_contract',
  'event_without_receivable',
  'event_financial_incomplete',
  'bar_not_closed',
  'physical_count_missing',
  'event_inventory_still_open',
  'open_containers_pending',
  'ticketing_configuration',
  'event_readiness',
] as const;

export type BchAlertType = (typeof BCH_ALERT_TYPES)[number];

/** Dias antes do evento para exigir contrato assinado. */
export const BCH_ALERT_CONTRACT_LEAD_DAYS = 7;

/** Horizonte de eventos passados (dias). */
export const BCH_ALERT_EVENT_HORIZON_PAST_DAYS = 30;

/** Horizonte de eventos futuros (dias). */
export const BCH_ALERT_EVENT_HORIZON_FUTURE_DAYS = 90;

/** Janela de prontidão operacional crítica (horas). */
export const BCH_ALERT_READINESS_HOURS = 48;

/** Dias em atraso: warning até 7, critical 8+. */
export const BCH_ALERT_OVERDUE_CRITICAL_AFTER_DAYS = 8;

export type BchAlertCandidate = {
  deduplicationKey: string;
  alertType: BchAlertType;
  severity: BchAlertSeverity;
  title: string;
  message: string;
  sourceModule: string;
  sourceType: string;
  sourceId: string | null;
  eventId: string | null;
  bookingId: string | null;
  actionUrl: string | null;
  metadata?: Record<string, unknown>;
};

export type BchOperationalAlertDto = {
  id: string;
  tenantId: string;
  eventId: string | null;
  eventName: string | null;
  bookingId: string | null;
  alertType: BchAlertType;
  severity: BchAlertSeverity;
  status: BchAlertStatus;
  title: string;
  message: string;
  sourceModule: string;
  sourceType: string;
  sourceId: string | null;
  deduplicationKey: string;
  actionUrl: string | null;
  detectedAt: string;
  acknowledgedAt: string | null;
  acknowledgedByUserId: string | null;
  resolvedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type BchAlertListQuery = {
  status?: string;
  severity?: string;
  alertType?: string;
  eventId?: string;
};

export type BchAlertSummaryCountsDto = {
  openCritical: number;
  openWarning: number;
  openInfo: number;
  acknowledgedUnresolved: number;
  recentlyResolved: number;
};
