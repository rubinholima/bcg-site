import { Prisma } from '@prisma/client';
import {
  BCH_ALERT_CONTRACT_LEAD_DAYS,
  BCH_ALERT_OVERDUE_CRITICAL_AFTER_DAYS,
  BCH_ALERT_READINESS_HOURS,
  type BchAlertCandidate,
  type BchAlertSeverity,
} from './boston-city-hall-operational-alert.constants';
import type { BchEventExecutiveSummaryDto } from './boston-city-hall-event-financial.constants';

const BCH_BASE = '/dashboard/eventos/boston-city-hall';

export type AlertEvaluationContext = {
  now: Date;
  events: Array<{
    id: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
    status: string;
    bookingId: string | null;
    ticketingEnabled: boolean;
  }>;
  signedContractByBooking: Map<string, { id: string; total: Prisma.Decimal }>;
  receivableByContract: Map<string, { id: string }>;
  barSalesCountByEvent: Map<string, number>;
  finalizedBarCloseByEvent: Map<string, boolean>;
  eventInventories: Array<{ id: string; eventId: string; status: string; locationId: string }>;
  completedPhysicalCountByEvent: Map<string, boolean>;
  openContainersByEvent: Map<string, number>;
  financialByEvent: Map<string, BchEventExecutiveSummaryDto>;
  ticketTypesByEvent: Map<
    string,
    Array<{ active: boolean; price: Prisma.Decimal | null; quantity: number | null; salesStartAt: Date | null; salesEndAt: Date | null; lots: Array<{ active: boolean; quantity: number }> }>
  >;
  overdueReceivables: Array<{
    receivableId: string;
    contractId: string;
    eventId: string | null;
    bookingId: string | null;
    maxOverdueDays: number;
    overdueBalance: Prisma.Decimal;
    currency: string;
  }>;
};

function eventEnded(event: { startDate: Date | null; endDate: Date | null }, now: Date): boolean {
  if (!event.startDate) return false;
  const end = event.endDate ?? new Date(event.startDate.getTime() + 6 * 60 * 60 * 1000);
  return end.getTime() < now.getTime();
}

function daysUntil(date: Date, now: Date): number {
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  const b = new Date(date);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function hoursUntil(date: Date, now: Date): number {
  return (date.getTime() - now.getTime()) / (3600 * 1000);
}

function overdueSeverity(maxDays: number): BchAlertSeverity {
  return maxDays >= BCH_ALERT_OVERDUE_CRITICAL_AFTER_DAYS ? 'critical' : 'warning';
}

export function buildAlertCandidates(ctx: AlertEvaluationContext): BchAlertCandidate[] {
  const out: BchAlertCandidate[] = [];

  for (const rec of ctx.overdueReceivables) {
    if (rec.overdueBalance.lte(0)) continue;
    const sev = overdueSeverity(rec.maxOverdueDays);
    out.push({
      deduplicationKey: `overdue_receivable:${rec.receivableId}`,
      alertType: 'overdue_receivable',
      severity: sev,
      title: 'Recebível vencido',
      message: `Saldo vencido de ${rec.currency} ${rec.overdueBalance.toFixed(2)} (${rec.maxOverdueDays} dia(s) em atraso).`,
      sourceModule: 'financeiro',
      sourceType: 'VenueReceivable',
      sourceId: rec.receivableId,
      eventId: rec.eventId,
      bookingId: rec.bookingId,
      actionUrl: rec.eventId ? `${BCH_BASE}/eventos/${rec.eventId}/financeiro` : `${BCH_BASE}/financeiro`,
      metadata: { maxOverdueDays: rec.maxOverdueDays, overdueBalance: rec.overdueBalance.toFixed(2) },
    });
  }

  for (const event of ctx.events) {
    const bookingId = event.bookingId;
    const ended = eventEnded(event, ctx.now);
    const start = event.startDate;

    if (bookingId && start) {
      const days = daysUntil(start, ctx.now);
      const signed = ctx.signedContractByBooking.has(bookingId);
      if (days >= 0 && days <= BCH_ALERT_CONTRACT_LEAD_DAYS && !signed) {
        out.push({
          deduplicationKey: `event_without_signed_contract:${event.id}`,
          alertType: 'event_without_signed_contract',
          severity: days <= 2 ? 'critical' : 'warning',
          title: 'Contrato não assinado',
          message: `Evento em ${days} dia(s) sem contrato assinado vinculado à reserva.`,
          sourceModule: 'contratos',
          sourceType: 'VenueBooking',
          sourceId: bookingId,
          eventId: event.id,
          bookingId,
          actionUrl: `${BCH_BASE}/operacao/${bookingId}`,
        });
      }

      const signedContract = ctx.signedContractByBooking.get(bookingId);
      if (signedContract && signedContract.total.gt(0) && !ctx.receivableByContract.has(signedContract.id)) {
        out.push({
          deduplicationKey: `event_without_receivable:${event.id}`,
          alertType: 'event_without_receivable',
          severity: 'warning',
          title: 'Recebível ausente',
          message: 'Contrato assinado com valor comercial, mas sem conta a receber vinculada.',
          sourceModule: 'financeiro',
          sourceType: 'VenueContract',
          sourceId: signedContract.id,
          eventId: event.id,
          bookingId,
          actionUrl: `${BCH_BASE}/financeiro`,
          metadata: { contractId: signedContract.id },
        });
      }
    }

    const fin = ctx.financialByEvent.get(event.id);
    if (fin && !fin.completeness.resultComplete) {
      out.push({
        deduplicationKey: `event_financial_incomplete:${event.id}`,
        alertType: 'event_financial_incomplete',
        severity: fin.multiCurrency ? 'info' : 'warning',
        title: 'Resultado financeiro incompleto',
        message: 'Dados financeiros do evento ainda não permitem resultado operacional completo.',
        sourceModule: 'financeiro',
        sourceType: 'Event',
        sourceId: event.id,
        eventId: event.id,
        bookingId,
        actionUrl: `${BCH_BASE}/eventos/${event.id}/financeiro`,
        metadata: { completeness: fin.completeness },
      });
    }

    const barSales = ctx.barSalesCountByEvent.get(event.id) ?? 0;
    if (ended && barSales > 0 && !ctx.finalizedBarCloseByEvent.get(event.id)) {
      out.push({
        deduplicationKey: `bar_not_closed:${event.id}`,
        alertType: 'bar_not_closed',
        severity: 'warning',
        title: 'Bar sem fechamento',
        message: 'Evento encerrado com vendas no bar, mas sem fechamento operacional finalizado.',
        sourceModule: 'bar',
        sourceType: 'Event',
        sourceId: event.id,
        eventId: event.id,
        bookingId,
        actionUrl: `${BCH_BASE}/bar/close?eventId=${encodeURIComponent(event.id)}`,
      });
    }

    const inventories = ctx.eventInventories.filter((i) => i.eventId === event.id);
    const hadInventory = inventories.length > 0;
    const closedInventory = inventories.some((i) => i.status === 'closed');
    const activeInventory = inventories.some((i) => i.status === 'active');

    if (hadInventory && closedInventory && !ctx.completedPhysicalCountByEvent.get(event.id)) {
      out.push({
        deduplicationKey: `physical_count_missing:${event.id}`,
        alertType: 'physical_count_missing',
        severity: 'warning',
        title: 'Contagem física pendente',
        message: 'Inventário de bar encerrado sem contagem física concluída para o evento.',
        sourceModule: 'bar',
        sourceType: 'Event',
        sourceId: event.id,
        eventId: event.id,
        bookingId,
        actionUrl: `${BCH_BASE}/bar/physical-counts?eventId=${encodeURIComponent(event.id)}`,
      });
    }

    if (ended && activeInventory) {
      out.push({
        deduplicationKey: `event_inventory_still_open:${event.id}`,
        alertType: 'event_inventory_still_open',
        severity: 'critical',
        title: 'Inventário de evento aberto',
        message: 'Evento já encerrado, mas inventário de bar ainda está ativo.',
        sourceModule: 'bar',
        sourceType: 'BchBarEventInventory',
        sourceId: inventories.find((i) => i.status === 'active')?.id ?? null,
        eventId: event.id,
        bookingId,
        actionUrl: `${BCH_BASE}/bar/event-inventory?eventId=${encodeURIComponent(event.id)}`,
      });
    }

    const openContainers = ctx.openContainersByEvent.get(event.id) ?? 0;
    if (ended && openContainers > 0) {
      out.push({
        deduplicationKey: `open_containers_pending:${event.id}`,
        alertType: 'open_containers_pending',
        severity: 'warning',
        title: 'Garrafas abertas pendentes',
        message: `${openContainers} container(s) aberto(s) ainda não encerrado(s) após o evento.`,
        sourceModule: 'bar',
        sourceType: 'BchBarOpenContainer',
        sourceId: event.id,
        eventId: event.id,
        bookingId,
        actionUrl: `${BCH_BASE}/bar?eventId=${encodeURIComponent(event.id)}`,
        metadata: { openContainers },
      });
    }

    if (event.ticketingEnabled && start && hoursUntil(start, ctx.now) <= BCH_ALERT_READINESS_HOURS && hoursUntil(start, ctx.now) > 0) {
      const types = ctx.ticketTypesByEvent.get(event.id) ?? [];
      const activeTypes = types.filter((t) => t.active);
      const hasSellable = activeTypes.some((t) => {
        const lots = t.lots.filter((l) => l.active);
        if (lots.length) return lots.some((l) => l.quantity > 0);
        return (t.quantity ?? 0) > 0;
      });
      const issues: string[] = [];
      if (!activeTypes.length) issues.push('sem tipo de ingresso ativo');
      else if (!hasSellable) issues.push('capacidade esgotada ou indisponível');
      if (issues.length) {
        out.push({
          deduplicationKey: `ticketing_configuration:${event.id}`,
          alertType: 'ticketing_configuration',
          severity: 'warning',
          title: 'Configuração de ingressos',
          message: `Venda de ingressos: ${issues.join('; ')}.`,
          sourceModule: 'ticketing',
          sourceType: 'EventTicketing',
          sourceId: event.id,
          eventId: event.id,
          bookingId,
          actionUrl: `${BCH_BASE}/ticketing?eventId=${encodeURIComponent(event.id)}`,
        });
      }
    }

    if (start && hoursUntil(start, ctx.now) <= BCH_ALERT_READINESS_HOURS && hoursUntil(start, ctx.now) > 0) {
      const criticalTypes = new Set<BchAlertCandidate['alertType']>([
        'event_without_signed_contract',
        'event_financial_incomplete',
        'ticketing_configuration',
      ]);
      const related = out.filter(
        (a) => a.eventId === event.id && criticalTypes.has(a.alertType) && a.severity !== 'info',
      );
      if (related.length >= 2) {
        out.push({
          deduplicationKey: `event_readiness:${event.id}`,
          alertType: 'event_readiness',
          severity: 'critical',
          title: 'Prontidão operacional',
          message: `Evento em ${Math.ceil(hoursUntil(start, ctx.now))}h com ${related.length} pendências críticas.`,
          sourceModule: 'operacao',
          sourceType: 'Event',
          sourceId: event.id,
          eventId: event.id,
          bookingId,
          actionUrl: `${BCH_BASE}/operacao/${bookingId ?? ''}`.replace(/\/$/, '') || `${BCH_BASE}/executive`,
          metadata: { relatedAlertTypes: related.map((r) => r.alertType) },
        });
      }
    }
  }

  return out;
}
