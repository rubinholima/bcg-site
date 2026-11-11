import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { resolveBchPublicAppOrigin } from '../boston-city-hall/boston-city-hall-public-access.util';
import {
  DEFAULT_PURCHASE_SETTINGS,
  REQUISITION_STATUS,
} from './purchase-workflow.constants';
import { cadastroUpperRequired } from '../common/cadastro-text';
import { WorkflowNotifyService } from './workflow-notify.service';
import {
  buildItemsSnapshotFromRequisition,
  type QuoteInviteItemLine,
  type QuoteItemWithLine,
} from './purchase-quote-invite.types';

function newInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

function publicQuoteUrl(token: string): string {
  const origin = resolveBchPublicAppOrigin();
  return `${origin}/cotacao/${encodeURIComponent(token)}`;
}

function parseSnapshot(raw: unknown): QuoteInviteItemLine[] {
  if (!Array.isArray(raw)) return [];
  return raw as QuoteInviteItemLine[];
}

function parseQuoteItems(raw: unknown): QuoteItemWithLine[] {
  if (!Array.isArray(raw)) return [];
  return raw as QuoteItemWithLine[];
}

function unitPriceForLine(
  quoteItems: QuoteItemWithLine[],
  line: QuoteInviteItemLine,
  lineIndex: number,
): number | null {
  const byId = quoteItems.find((q) => q.lineId === line.lineId);
  if (byId != null && typeof byId.unitPrice === 'number' && !Number.isNaN(byId.unitPrice)) {
    return byId.unitPrice;
  }
  const byIndex = quoteItems[lineIndex];
  if (byIndex != null && typeof byIndex.unitPrice === 'number' && !Number.isNaN(byIndex.unitPrice)) {
    return byIndex.unitPrice;
  }
  const byDesc = quoteItems.find(
    (q) => q.description?.trim().toUpperCase() === line.description.trim().toUpperCase(),
  );
  if (byDesc != null && typeof byDesc.unitPrice === 'number' && !Number.isNaN(byDesc.unitPrice)) {
    return byDesc.unitPrice;
  }
  return null;
}

@Injectable()
export class PurchaseQuoteInviteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: WorkflowNotifyService,
  ) {}

  private async getSettingsMaxQuotes(tenantId: string): Promise<number> {
    const row = await this.prisma.purchaseSetting.findUnique({ where: { tenantId } });
    return row?.maxQuotes ?? DEFAULT_PURCHASE_SETTINGS.maxQuotes;
  }

  private async assertRequisitionInQuotation(requisitionId: string) {
    const req = await this.prisma.purchaseRequisition.findUnique({
      where: { id: requisitionId },
      include: { quotes: true },
    });
    if (!req) throw new NotFoundException('Requisição não encontrada');
    if (req.status !== REQUISITION_STATUS.EM_COTACAO) {
      throw new BadRequestException('Requisição não está em cotação.');
    }
    return req;
  }

  private async sendInviteEmail(inviteId: string) {
    const invite = await this.prisma.purchaseQuoteInvite.findUnique({
      where: { id: inviteId },
      include: {
        tenant: { select: { name: true } },
        requisition: { select: { departmentName: true } },
        supplier: { select: { email: true } },
      },
    });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    const toEmail = invite.supplierEmail?.trim() || invite.supplier?.email?.trim();
    if (!toEmail) {
      return { emailSent: false, emailError: 'Fornecedor sem e-mail cadastrado' };
    }
    return this.notify.notifySupplierQuoteInvite({
      toEmail,
      tenantName: invite.tenant.name,
      supplierName: invite.supplierName,
      departmentName: invite.requisition.departmentName,
      publicUrl: publicQuoteUrl(invite.token),
      expiresAt: invite.expiresAt,
    });
  }

  async createInvites(
    requisitionId: string,
    input: { supplierIds: string[]; expiresInDays?: number; sendEmail?: boolean },
  ) {
    const req = await this.assertRequisitionInQuotation(requisitionId);
    const sendEmail = input.sendEmail !== false;
    const supplierIds = [...new Set(input.supplierIds.filter(Boolean))];
    if (!supplierIds.length) {
      throw new BadRequestException('Selecione ao menos um fornecedor.');
    }

    const snapshot = buildItemsSnapshotFromRequisition(req.items);
    if (!snapshot.length || !snapshot.some((l) => l.description)) {
      throw new BadRequestException('Requisição sem itens para cotar.');
    }

    const expiresAt =
      input.expiresInDays != null && input.expiresInDays > 0
        ? new Date(Date.now() + input.expiresInDays * 86400000)
        : null;

    const created: Array<{
      id: string;
      token: string;
      publicUrl: string;
      supplierId: string | null;
      supplierName: string;
      status: string;
    }> = [];
    const emails: Array<{
      inviteId: string;
      supplierName: string;
      emailSent: boolean;
      emailError?: string;
    }> = [];

    for (const supplierId of supplierIds) {
      const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier || supplier.tenantId !== req.tenantId) {
        throw new BadRequestException(`Fornecedor inválido: ${supplierId}`);
      }

      const pending = await this.prisma.purchaseQuoteInvite.findFirst({
        where: {
          requisitionId,
          supplierId,
          status: 'pending',
        },
      });
      if (pending) {
        created.push({
          id: pending.id,
          token: pending.token,
          publicUrl: publicQuoteUrl(pending.token),
          supplierId: pending.supplierId,
          supplierName: pending.supplierName,
          status: pending.status,
        });
        if (sendEmail) {
          const mail = await this.sendInviteEmail(pending.id);
          emails.push({
            inviteId: pending.id,
            supplierName: pending.supplierName,
            emailSent: mail.emailSent,
            emailError: mail.emailError,
          });
        }
        continue;
      }

      const token = newInviteToken();
      const row = await this.prisma.purchaseQuoteInvite.create({
        data: {
          tenantId: req.tenantId,
          requisitionId,
          supplierId,
          supplierName: supplier.name,
          supplierEmail: supplier.email,
          token,
          itemsSnapshot: snapshot as object,
          expiresAt,
        },
      });
      created.push({
        id: row.id,
        token: row.token,
        publicUrl: publicQuoteUrl(row.token),
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        status: row.status,
      });
      if (sendEmail) {
        const mail = await this.sendInviteEmail(row.id);
        emails.push({
          inviteId: row.id,
          supplierName: row.supplierName,
          emailSent: mail.emailSent,
          emailError: mail.emailError,
        });
      }
    }

    return { invites: created, emails };
  }

  async resendInviteEmail(requisitionId: string, inviteId: string) {
    await this.assertRequisitionInQuotation(requisitionId);
    const invite = await this.prisma.purchaseQuoteInvite.findFirst({
      where: { id: inviteId, requisitionId },
    });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    if (invite.status !== 'pending') {
      throw new BadRequestException('Só é possível reenviar e-mail de convites pendentes.');
    }
    const mail = await this.sendInviteEmail(inviteId);
    return mail;
  }

  async renewInvite(requisitionId: string, inviteId: string, expiresInDays?: number) {
    const req = await this.assertRequisitionInQuotation(requisitionId);
    const invite = await this.prisma.purchaseQuoteInvite.findFirst({
      where: { id: inviteId, requisitionId },
    });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    if (invite.status === 'submitted') {
      throw new BadRequestException('Cotação já enviada. Gere um novo convite para outro ciclo.');
    }
    const expiresAt =
      expiresInDays != null && expiresInDays > 0
        ? new Date(Date.now() + expiresInDays * 86400000)
        : invite.expiresAt;
    const token = newInviteToken();
    const updated = await this.prisma.purchaseQuoteInvite.update({
      where: { id: inviteId },
      data: {
        token,
        status: 'pending',
        expiresAt,
        itemsSnapshot: buildItemsSnapshotFromRequisition(req.items) as object,
      },
    });
    return {
      id: updated.id,
      token: updated.token,
      publicUrl: publicQuoteUrl(updated.token),
      status: updated.status,
    };
  }

  async listInvites(requisitionId: string) {
    const req = await this.prisma.purchaseRequisition.findUnique({
      where: { id: requisitionId },
      select: { id: true },
    });
    if (!req) throw new NotFoundException('Requisição não encontrada');
    const rows = await this.prisma.purchaseQuoteInvite.findMany({
      where: { requisitionId },
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    return rows.map((r) => ({
      ...r,
      publicUrl: publicQuoteUrl(r.token),
    }));
  }

  async cancelInvite(requisitionId: string, inviteId: string) {
    await this.assertRequisitionInQuotation(requisitionId);
    const invite = await this.prisma.purchaseQuoteInvite.findFirst({
      where: { id: inviteId, requisitionId },
    });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    if (invite.status !== 'pending') {
      throw new BadRequestException('Só é possível cancelar convites pendentes.');
    }
    await this.prisma.purchaseQuoteInvite.update({
      where: { id: inviteId },
      data: { status: 'cancelled' },
    });
    return { ok: true };
  }

  async getComparison(requisitionId: string) {
    const req = await this.prisma.purchaseRequisition.findUnique({
      where: { id: requisitionId },
      include: {
        quotes: {
          orderBy: { totalAmount: 'asc' },
          include: { supplier: { select: { id: true, name: true } } },
        },
      },
    });
    if (!req) throw new NotFoundException('Requisição não encontrada');

    const lines = buildItemsSnapshotFromRequisition(req.items);
    const comparisonLines = lines.map((line, lineIndex) => {
      const offers: Array<{
        quoteId: string;
        supplierName: string;
        unitPrice: number;
        lineTotal: number;
      }> = [];

      for (const quote of req.quotes) {
        const quoteItems = parseQuoteItems(quote.items);
        const unitPrice = unitPriceForLine(quoteItems, line, lineIndex);
        if (unitPrice == null) continue;
        offers.push({
          quoteId: quote.id,
          supplierName: quote.supplierName,
          unitPrice,
          lineTotal: unitPrice * line.quantity,
        });
      }

      offers.sort((a, b) => a.unitPrice - b.unitPrice);
      const lowest = offers[0] ?? null;

      return {
        lineId: line.lineId,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        offers,
        lowest,
      };
    });

    const suppliers = req.quotes.map((q) => ({
      quoteId: q.id,
      supplierName: q.supplierName,
      totalAmount: q.totalAmount,
      deliveryDays: q.deliveryDays,
      paymentTerms: (q as { paymentTerms?: string | null }).paymentTerms ?? null,
      pricingBreakdown: (q as { pricingBreakdown?: Record<string, number> | null }).pricingBreakdown ?? null,
    }));

    const lowestTotalQuoteId =
      req.quotes.length > 0
        ? [...req.quotes].sort((a, b) => a.totalAmount - b.totalAmount)[0]!.id
        : null;

    const matrixRows = lines.map((line, lineIndex) => {
      const prices: Record<string, number | null> = {};
      let lowestQuoteId: string | null = null;
      let lowestPrice = Infinity;
      for (const quote of req.quotes) {
        const quoteItems = parseQuoteItems(quote.items);
        const unitPrice = unitPriceForLine(quoteItems, line, lineIndex);
        prices[quote.id] = unitPrice;
        if (unitPrice != null && unitPrice < lowestPrice) {
          lowestPrice = unitPrice;
          lowestQuoteId = quote.id;
        }
      }
      return {
        lineId: line.lineId,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        prices,
        lowestQuoteId,
      };
    });

    return {
      requisitionId: req.id,
      status: req.status,
      lines: comparisonLines,
      matrix: { suppliers, rows: matrixRows, lowestTotalQuoteId },
    };
  }

  async getPublicForm(token: string) {
    const invite = await this.prisma.purchaseQuoteInvite.findUnique({
      where: { token },
      include: {
        requisition: {
          select: {
            departmentName: true,
            requestedAt: true,
            status: true,
          },
        },
        tenant: { select: { name: true } },
        purchaseQuote: {
          select: {
            totalAmount: true,
            deliveryDays: true,
            notes: true,
            items: true,
          },
        },
      },
    });
    if (!invite) throw new NotFoundException('Link inválido.');
    if (invite.status === 'cancelled') {
      throw new NotFoundException('Este convite foi cancelado.');
    }
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException('Link expirado.');
    }
    if (invite.requisition.status !== REQUISITION_STATUS.EM_COTACAO && invite.status === 'pending') {
      throw new BadRequestException('Esta requisição não está mais em cotação.');
    }

    const items = parseSnapshot(invite.itemsSnapshot);
    const submittedQuote =
      invite.status === 'submitted' && invite.purchaseQuote
        ? {
            totalAmount: invite.purchaseQuote.totalAmount,
            deliveryDays: invite.purchaseQuote.deliveryDays,
            notes: invite.purchaseQuote.notes,
            lines: parseQuoteItems(invite.purchaseQuote.items),
          }
        : null;
    return {
      tenantName: invite.tenant.name,
      supplierName: invite.supplierName,
      departmentName: invite.requisition.departmentName,
      requestedAt: invite.requisition.requestedAt,
      items,
      status: invite.status,
      alreadySubmitted: invite.status === 'submitted',
      expiresAt: invite.expiresAt,
      submittedQuote,
    };
  }

  async submitPublicQuote(
    token: string,
    body: {
      lines: Array<{ lineId: string; unitPrice: number }>;
      deliveryDays?: number;
      notes?: string;
    },
  ) {
    const invite = await this.prisma.purchaseQuoteInvite.findUnique({
      where: { token },
      include: {
        requisition: { include: { quotes: true } },
      },
    });
    if (!invite) throw new NotFoundException('Link inválido.');
    if (invite.status !== 'pending') {
      throw new BadRequestException('Esta cotação já foi enviada.');
    }
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Link expirado.');
    }
    if (invite.requisition.status !== REQUISITION_STATUS.EM_COTACAO) {
      throw new BadRequestException('Esta requisição não está mais em cotação.');
    }

    const snapshot = parseSnapshot(invite.itemsSnapshot);
    if (!snapshot.length) throw new BadRequestException('Itens indisponíveis.');

    const priceByLine = new Map<string, number>();
    for (const row of body.lines ?? []) {
      if (!row?.lineId) continue;
      const price = Number(row.unitPrice);
      if (!Number.isFinite(price) || price < 0) {
        throw new BadRequestException('Informe preços válidos para todos os itens.');
      }
      priceByLine.set(row.lineId, price);
    }

    for (const line of snapshot) {
      if (!priceByLine.has(line.lineId)) {
        throw new BadRequestException(`Informe o preço do item: ${line.description}`);
      }
    }

    const maxQuotes = await this.getSettingsMaxQuotes(invite.tenantId);
    if (invite.requisition.quotes.length >= maxQuotes) {
      throw new BadRequestException(`Limite de ${maxQuotes} cotações atingido.`);
    }

    const quoteItems: QuoteItemWithLine[] = snapshot.map((line) => ({
      lineId: line.lineId,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPrice: priceByLine.get(line.lineId)!,
    }));

    const totalAmount = quoteItems.reduce(
      (sum, i) => sum + i.unitPrice * i.quantity,
      0,
    );

    const deliveryDays =
      body.deliveryDays != null && Number.isFinite(Number(body.deliveryDays))
        ? Math.max(0, Math.trunc(Number(body.deliveryDays)))
        : null;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: invite.tenantId },
      select: { name: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const quote = await tx.purchaseQuote.create({
        data: {
          requisitionId: invite.requisitionId,
          supplierId: invite.supplierId,
          supplierName: cadastroUpperRequired(invite.supplierName),
          items: quoteItems as object,
          totalAmount,
          deliveryDays,
          notes: body.notes?.trim() || null,
        },
      });
      await tx.purchaseQuoteInvite.update({
        where: { id: invite.id },
        data: {
          status: 'submitted',
          purchaseQuoteId: quote.id,
          submittedAt: new Date(),
        },
      });
      return quote;
    });

    if (tenant) {
      void this.notify.notifyComprasQuoteReceived({
        tenantId: invite.tenantId,
        tenantName: tenant.name,
        supplierName: invite.supplierName,
        totalAmount,
        requisitionId: invite.requisitionId,
      });
    }

    return {
      ok: true,
      quoteId: result.id,
      totalAmount,
    };
  }
}
