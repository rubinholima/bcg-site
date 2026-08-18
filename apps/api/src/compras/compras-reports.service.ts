import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decimalToNumber } from './product-pricing.util';
import { INVENTORY_KIND_LABELS } from './inventory-kinds';
import { REQUISITION_STATUS_LABELS } from './purchase-workflow.constants';

export const COMPRAS_REPORT_SCOPES = [
  'geral',
  'entradas',
  'saidas',
  'saidas_departamento',
  'cozinha',
  'requisicoes',
  'compras',
] as const;

export type ComprasReportScope = (typeof COMPRAS_REPORT_SCOPES)[number];

const KITCHEN_INVENTORY_KINDS = [
  'alimentacao',
  'nutricao_suplementacao',
  'alimentacao_viagem',
  'nutricao_hidratacao',
] as const;

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  purchase: 'Entrada — compra/recebimento',
  requisition: 'Saída — requisição',
  adjustment: 'Ajuste manual',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  approved: 'Aprovado',
  received: 'Recebido',
  cancelled: 'Cancelado',
};

type RequisitionItem = {
  description?: string;
  quantity?: number;
  unit?: string;
  productId?: string;
};

function parseItems(raw: unknown): RequisitionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is RequisitionItem => !!x && typeof x === 'object');
}

function itemsSummary(raw: unknown): string {
  const items = parseItems(raw);
  if (items.length === 0) return '—';
  return items
    .slice(0, 4)
    .map((i) => {
      const qty = i.quantity != null ? `${i.quantity}` : '';
      const unit = i.unit?.trim() ? ` ${i.unit.trim()}` : '';
      return `${i.description ?? 'Item'}${qty ? ` (${qty}${unit})` : ''}`;
    })
    .join(' · ');
}

function dateRange(from?: string, to?: string): { gte?: Date; lte?: Date } {
  const range: { gte?: Date; lte?: Date } = {};
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    range.gte = new Date(`${from}T00:00:00.000Z`);
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    range.lte = new Date(`${to}T23:59:59.999Z`);
  }
  return range;
}

function movementDirectionLabel(quantity: number): string {
  return quantity > 0 ? 'Entrada' : quantity < 0 ? 'Saída' : '—';
}

function inventoryKindLabel(kind: string | null | undefined): string {
  if (!kind?.trim()) return '—';
  return INVENTORY_KIND_LABELS[kind] ?? kind;
}

@Injectable()
export class ComprasReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDepartments(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Clube não encontrado');

    const rows = await this.prisma.purchaseRequisition.findMany({
      where: { tenantId, departmentName: { not: null } },
      select: { departmentName: true },
      distinct: ['departmentName'],
      orderBy: { departmentName: 'asc' },
    });

    const fromReq = rows
      .map((r) => r.departmentName?.trim())
      .filter((n): n is string => !!n);

    const extras = ['COZINHA', 'NUTRIÇÃO', 'MANUTENÇÃO', 'LIMPEZA'];
    const merged = [...new Set([...fromReq, ...extras])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return merged;
  }

  async buildReport(input: {
    tenantId: string;
    scope: string;
    from?: string;
    fromDate?: string;
    to?: string;
    toDate?: string;
    departmentName?: string;
    inventoryKind?: string;
  }) {
    const tenantId = input.tenantId?.trim();
    if (!tenantId) throw new BadRequestException('Informe o clube/empresa');

    const scopeRaw = (input.scope?.trim() || 'geral').toLowerCase();
    if (!COMPRAS_REPORT_SCOPES.includes(scopeRaw as ComprasReportScope)) {
      throw new BadRequestException('Escopo de relatório inválido');
    }
    const scope = scopeRaw as ComprasReportScope;

    const from = input.from?.trim() || input.fromDate?.trim();
    const to = input.to?.trim() || input.toDate?.trim();
    const createdAt = dateRange(from, to);
    const departmentFilter = input.departmentName?.trim().toUpperCase();
    const inventoryKind = input.inventoryKind?.trim();

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, tradeName: true },
    });
    if (!tenant) throw new NotFoundException('Clube não encontrado');

    const productWhere: Prisma.ProductWhereInput = { tenantId };
    if (inventoryKind) productWhere.inventoryKind = inventoryKind;

    const includeMovements =
      scope === 'geral' ||
      scope === 'entradas' ||
      scope === 'saidas' ||
      scope === 'saidas_departamento' ||
      scope === 'cozinha';

    const includeRequisitions = scope === 'geral' || scope === 'requisicoes';
    const includeOrders = scope === 'geral' || scope === 'compras' || scope === 'entradas';

    let movements: Array<{
      id: string;
      date: string;
      direction: string;
      type: string;
      typeLabel: string;
      productName: string;
      sku: string | null;
      unit: string | null;
      inventoryKind: string | null;
      inventoryKindLabel: string;
      quantity: number;
      unitPrice: number | null;
      totalValue: number | null;
      departmentName: string | null;
      referenceLabel: string | null;
      notes: string | null;
    }> = [];

    if (includeMovements) {
      const rows = await this.prisma.stockMovement.findMany({
        where: {
          ...(Object.keys(createdAt).length ? { createdAt } : {}),
          product: productWhere,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 5000,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              inventoryKind: true,
              tenantId: true,
            },
          },
        },
      });

      const requisitionIds = [
        ...new Set(
          rows
            .filter((r) => r.referenceType === 'requisition' && r.referenceId)
            .map((r) => r.referenceId as string),
        ),
      ];

      const requisitionsById = new Map<string, { departmentName: string | null; requestedByName: string | null }>();
      if (requisitionIds.length > 0) {
        const reqs = await this.prisma.purchaseRequisition.findMany({
          where: { id: { in: requisitionIds }, tenantId },
          select: { id: true, departmentName: true, requestedByName: true },
        });
        for (const req of reqs) {
          requisitionsById.set(req.id, {
            departmentName: req.departmentName,
            requestedByName: req.requestedByName,
          });
        }
      }

      movements = rows
        .map((row) => {
          const linked = row.referenceId ? requisitionsById.get(row.referenceId) : undefined;
          const departmentName =
            linked?.departmentName ??
            (row.notes?.toUpperCase().includes('COZINHA') ? 'COZINHA' : null);

          const unitPrice = row.unitPrice != null ? decimalToNumber(row.unitPrice) : null;
          const totalValue = unitPrice != null ? Math.abs(row.quantity) * unitPrice : null;

          return {
            id: row.id,
            date: row.createdAt.toISOString(),
            direction: movementDirectionLabel(row.quantity),
            type: row.type,
            typeLabel: MOVEMENT_TYPE_LABELS[row.type] ?? row.type,
            productName: row.product.name,
            sku: row.product.sku,
            unit: row.product.unit,
            inventoryKind: row.product.inventoryKind,
            inventoryKindLabel: inventoryKindLabel(row.product.inventoryKind),
            quantity: row.quantity,
            unitPrice,
            totalValue,
            departmentName,
            referenceLabel:
              row.referenceType === 'requisition' && row.referenceId
                ? `Requisição ${row.referenceId.slice(0, 8)}…`
                : row.referenceType === 'order' && row.referenceId
                  ? `Pedido ${row.referenceId.slice(0, 8)}…`
                  : linked?.requestedByName
                    ? `Solicitante: ${linked.requestedByName}`
                    : null,
            notes: row.notes,
          };
        })
        .filter((row) => {
          if (scope === 'entradas') return row.quantity > 0;
          if (scope === 'saidas') return row.quantity < 0;
          if (scope === 'saidas_departamento') {
            if (row.quantity >= 0) return false;
            if (!departmentFilter) return true;
            const dept = row.departmentName?.toUpperCase() ?? '';
            const note = row.notes?.toUpperCase() ?? '';
            return dept.includes(departmentFilter) || note.includes(departmentFilter);
          }
          if (scope === 'cozinha') {
            const kitchenKind = row.inventoryKind
              ? KITCHEN_INVENTORY_KINDS.includes(
                  row.inventoryKind as (typeof KITCHEN_INVENTORY_KINDS)[number],
                )
              : false;
            const kitchenNote =
              row.notes?.toLowerCase().includes('cozinha') ||
              row.departmentName?.toUpperCase().includes('COZINHA');
            return kitchenKind || kitchenNote;
          }
          return true;
        });
    }

    let requisitions: Array<{
      id: string;
      date: string;
      departmentName: string | null;
      requestedByName: string | null;
      status: string;
      statusLabel: string;
      requestType: string | null;
      totalEstimated: number | null;
      approvedTotal: number | null;
      itemsSummary: string;
      justification: string | null;
    }> = [];

    if (includeRequisitions) {
      const reqWhere: Prisma.PurchaseRequisitionWhereInput = {
        tenantId,
        ...(Object.keys(createdAt).length ? { requestedAt: createdAt } : {}),
      };
      if (departmentFilter) {
        reqWhere.departmentName = { contains: departmentFilter, mode: 'insensitive' };
      }

      const rows = await this.prisma.purchaseRequisition.findMany({
        where: reqWhere,
        orderBy: [{ requestedAt: 'desc' }],
        take: 500,
        select: {
          id: true,
          requestedAt: true,
          departmentName: true,
          requestedByName: true,
          status: true,
          requestType: true,
          totalEstimated: true,
          approvedTotal: true,
          items: true,
          justification: true,
        },
      });

      requisitions = rows.map((row) => ({
        id: row.id,
        date: row.requestedAt.toISOString(),
        departmentName: row.departmentName,
        requestedByName: row.requestedByName,
        status: row.status,
        statusLabel: REQUISITION_STATUS_LABELS[row.status] ?? row.status,
        requestType: row.requestType,
        totalEstimated: row.totalEstimated ?? null,
        approvedTotal: row.approvedTotal ?? null,
        itemsSummary: itemsSummary(row.items),
        justification: row.justification,
      }));
    }

    let orders: Array<{
      id: string;
      date: string;
      orderNumber: string | null;
      status: string;
      statusLabel: string;
      supplierName: string;
      totalAmount: number | null;
      itemsSummary: string;
      requisitionDepartment: string | null;
    }> = [];

    if (includeOrders) {
      const orderWhere: Prisma.PurchaseOrderWhereInput = {
        tenantId,
        ...(Object.keys(createdAt).length ? { orderedAt: createdAt } : {}),
      };
      if (scope === 'compras') {
        orderWhere.status = { in: ['received', 'approved', 'sent'] };
      }

      const rows = await this.prisma.purchaseOrder.findMany({
        where: orderWhere,
        orderBy: [{ orderedAt: 'desc' }],
        take: 500,
        include: {
          supplier: { select: { name: true } },
          requisition: { select: { departmentName: true } },
        },
      });

      orders = rows.map((row) => ({
        id: row.id,
        date: row.orderedAt.toISOString(),
        orderNumber: row.orderNumber,
        status: row.status,
        statusLabel: ORDER_STATUS_LABELS[row.status] ?? row.status,
        supplierName: row.supplier.name,
        totalAmount: row.totalAmount ?? null,
        itemsSummary: itemsSummary(row.items),
        requisitionDepartment: row.requisition?.departmentName ?? null,
      }));
    }

    const summary = {
      movementCount: movements.length,
      entriesCount: movements.filter((m) => m.quantity > 0).length,
      exitsCount: movements.filter((m) => m.quantity < 0).length,
      requisitionCount: requisitions.length,
      orderCount: orders.length,
      totalEntryQty: movements.filter((m) => m.quantity > 0).reduce((s, m) => s + m.quantity, 0),
      totalExitQty: movements
        .filter((m) => m.quantity < 0)
        .reduce((s, m) => s + Math.abs(m.quantity), 0),
    };

    return {
      tenant: {
        id: tenant.id,
        name: tenant.tradeName?.trim() || tenant.name,
        slug: tenant.slug,
      },
      scope,
      period: { from: from ?? null, to: to ?? null },
      filters: {
        departmentName: departmentFilter ?? null,
        inventoryKind: inventoryKind ?? null,
      },
      summary,
      movements,
      requisitions,
      orders,
    };
  }
}
