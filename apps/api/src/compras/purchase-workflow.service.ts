import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';
import { HelloSignService } from '../hello-sign/hello-sign.service';
import { StockMovementsService } from './stock-movements.service';
import { WorkflowNotifyService } from './workflow-notify.service';
import {
  APPROVAL_ROLE,
  DEFAULT_PURCHASE_SETTINGS,
  REQUISITION_STATUS,
  requisitionInclude,
} from './purchase-workflow.constants';
import { cadastroEmail, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';

interface RequisitionItem {
  productId?: string;
  description: string;
  quantity: number;
  unit?: string;
  estimatedUnitPrice?: number;
  isPatrimonial?: boolean;
}

function parseRequisitionItems(raw: unknown): RequisitionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw as RequisitionItem[];
}

@Injectable()
export class PurchaseWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helloSign: HelloSignService,
    private readonly stockMovements: StockMovementsService,
    private readonly notify: WorkflowNotifyService,
  ) {}

  async getSettings(tenantId: string) {
    const row = await this.prisma.purchaseSetting.findUnique({ where: { tenantId } });
    if (row) return row;
    return {
      ...DEFAULT_PURCHASE_SETTINGS,
      tenantId,
      id: null,
    };
  }

  async listAllSettings() {
    const [tenants, settings] = await Promise.all([
      this.prisma.tenant.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.purchaseSetting.findMany(),
    ]);
    const byTenant = new Map(settings.map((s) => [s.tenantId, s]));
    return tenants.map((t) => {
      const row = byTenant.get(t.id);
      return {
        tenantId: t.id,
        tenantName: t.name,
        tenantSlug: t.slug,
        approvalThresholdBrl: row?.approvalThresholdBrl ?? DEFAULT_PURCHASE_SETTINGS.approvalThresholdBrl,
        minQuotes: row?.minQuotes ?? DEFAULT_PURCHASE_SETTINGS.minQuotes,
        maxQuotes: row?.maxQuotes ?? DEFAULT_PURCHASE_SETTINGS.maxQuotes,
        comprasNotifyEmail: row?.comprasNotifyEmail ?? null,
        comprasNotifyPhone: row?.comprasNotifyPhone ?? null,
        financeiroNotifyEmail: row?.financeiroNotifyEmail ?? null,
        financeiroNotifyPhone: row?.financeiroNotifyPhone ?? null,
        tiNotifyEmail: row?.tiNotifyEmail ?? null,
        tiNotifyPhone: row?.tiNotifyPhone ?? null,
        diretoriaNotifyEmail: row?.diretoriaNotifyEmail ?? null,
        diretoriaNotifyPhone: row?.diretoriaNotifyPhone ?? null,
        hasSavedSettings: !!row,
      };
    });
  }

  async upsertSettings(
    tenantId: string,
    data: {
      approvalThresholdBrl?: number;
      minQuotes?: number;
      maxQuotes?: number;
      comprasNotifyEmail?: string | null;
      comprasNotifyPhone?: string | null;
      financeiroNotifyEmail?: string | null;
      financeiroNotifyPhone?: string | null;
      tiNotifyEmail?: string | null;
      tiNotifyPhone?: string | null;
      diretoriaNotifyEmail?: string | null;
      diretoriaNotifyPhone?: string | null;
    },
  ) {
    const notifyFields = {
      ...(data.comprasNotifyEmail !== undefined && {
        comprasNotifyEmail: cadastroEmail(data.comprasNotifyEmail),
      }),
      ...(data.comprasNotifyPhone !== undefined && {
        comprasNotifyPhone: data.comprasNotifyPhone?.trim() || null,
      }),
      ...(data.financeiroNotifyEmail !== undefined && {
        financeiroNotifyEmail: cadastroEmail(data.financeiroNotifyEmail),
      }),
      ...(data.financeiroNotifyPhone !== undefined && {
        financeiroNotifyPhone: data.financeiroNotifyPhone?.trim() || null,
      }),
      ...(data.tiNotifyEmail !== undefined && {
        tiNotifyEmail: cadastroEmail(data.tiNotifyEmail),
      }),
      ...(data.tiNotifyPhone !== undefined && {
        tiNotifyPhone: data.tiNotifyPhone?.trim() || null,
      }),
      ...(data.diretoriaNotifyEmail !== undefined && {
        diretoriaNotifyEmail: cadastroEmail(data.diretoriaNotifyEmail),
      }),
      ...(data.diretoriaNotifyPhone !== undefined && {
        diretoriaNotifyPhone: data.diretoriaNotifyPhone?.trim() || null,
      }),
    };
    return this.prisma.purchaseSetting.upsert({
      where: { tenantId },
      create: {
        tenantId,
        approvalThresholdBrl: data.approvalThresholdBrl ?? DEFAULT_PURCHASE_SETTINGS.approvalThresholdBrl,
        minQuotes: data.minQuotes ?? DEFAULT_PURCHASE_SETTINGS.minQuotes,
        maxQuotes: data.maxQuotes ?? DEFAULT_PURCHASE_SETTINGS.maxQuotes,
        ...notifyFields,
      },
      update: {
        ...(data.approvalThresholdBrl != null && { approvalThresholdBrl: data.approvalThresholdBrl }),
        ...(data.minQuotes != null && { minQuotes: data.minQuotes }),
        ...(data.maxQuotes != null && { maxQuotes: data.maxQuotes }),
        ...notifyFields,
      },
    });
  }

  async findRequisition(id: string) {
    const row = await this.prisma.purchaseRequisition.findUnique({
      where: { id },
      include: requisitionInclude,
    });
    if (!row) throw new NotFoundException('Requisição não encontrada');
    return row;
  }

  async findAll(filters?: {
    tenantId?: string;
    status?: string;
    requestType?: string;
    requestedByUserId?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.tenantId) where.tenantId = filters.tenantId;
    if (filters?.status) where.status = filters.status;
    if (filters?.requestType) where.requestType = filters.requestType;
    if (filters?.requestedByUserId) where.requestedByUserId = filters.requestedByUserId;
    return this.prisma.purchaseRequisition.findMany({
      where,
      orderBy: [{ requestedAt: 'desc' }],
      include: requisitionInclude,
    });
  }

  async findPendingApprovals(role: 'financeiro' | 'diretoria', tenantId?: string) {
    const status =
      role === APPROVAL_ROLE.FINANCEIRO
        ? REQUISITION_STATUS.AGUARDANDO_FINANCEIRO
        : REQUISITION_STATUS.AGUARDANDO_DIRETORIA;
    return this.findAll({ tenantId, status });
  }

  async createRequisition(input: {
    tenantId: string;
    requestedByUserId?: string;
    requestedByName: string;
    requesterEmail?: string;
    requestType?: string;
    departmentName?: string;
    justification?: string;
    items: RequisitionItem[];
    totalEstimated?: number;
    isPatrimonial?: boolean;
  }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw new NotFoundException('Empresa não encontrada');
    const isPatrimonial =
      input.isPatrimonial ??
      input.items.some((i) => i.isPatrimonial === true);
    return this.prisma.purchaseRequisition.create({
      data: {
        tenantId: input.tenantId,
        requestedByUserId: input.requestedByUserId ?? null,
        requestedByName: cadastroUpperRequired(input.requestedByName),
        requesterEmail: cadastroEmail(input.requesterEmail),
        requestType: input.requestType ?? 'compra',
        departmentName: cadastroUpper(input.departmentName),
        justification: input.justification ?? null,
        items: input.items.map((i) => ({
          ...i,
          description: cadastroUpperRequired(i.description),
          unit: i.unit ? cadastroUpperRequired(i.unit) : i.unit,
        })) as object,
        totalEstimated: input.totalEstimated ?? null,
        isPatrimonial,
        status: REQUISITION_STATUS.RASCUNHO,
      },
      include: requisitionInclude,
    });
  }

  async updateRequisition(
    id: string,
    input: Partial<{
      justification: string;
      items: RequisitionItem[];
      totalEstimated: number;
      isPatrimonial: boolean;
      departmentName: string;
    }>,
    userId?: string,
  ) {
    const req = await this.findRequisition(id);
    if (req.status !== REQUISITION_STATUS.RASCUNHO) {
      throw new BadRequestException('Só é possível editar requisições em rascunho.');
    }
    if (userId && req.requestedByUserId && req.requestedByUserId !== userId) {
      throw new ForbiddenException('Você não pode editar esta requisição.');
    }
    return this.prisma.purchaseRequisition.update({
      where: { id },
      data: {
        ...(input.justification !== undefined && { justification: input.justification }),
        ...(input.items != null && {
          items: input.items.map((i) => ({
            ...i,
            description: cadastroUpperRequired(i.description),
            unit: i.unit ? cadastroUpperRequired(i.unit) : i.unit,
          })) as object,
        }),
        ...(input.totalEstimated !== undefined && { totalEstimated: input.totalEstimated }),
        ...(input.isPatrimonial !== undefined && { isPatrimonial: input.isPatrimonial }),
        ...(input.departmentName !== undefined && {
          departmentName: cadastroUpper(input.departmentName),
        }),
      },
      include: requisitionInclude,
    });
  }

  async submitRequisition(id: string, userId?: string) {
    const req = await this.findRequisition(id);
    if (req.status !== REQUISITION_STATUS.RASCUNHO) {
      throw new BadRequestException('Requisição já foi enviada.');
    }
    if (userId && req.requestedByUserId && req.requestedByUserId !== userId) {
      throw new ForbiddenException('Você não pode enviar esta requisição.');
    }
    const updated = await this.prisma.purchaseRequisition.update({
      where: { id },
      data: { status: REQUISITION_STATUS.ENVIADA },
      include: requisitionInclude,
    });
    void this.notify
      .notifyNewRequisition({
        tenantId: updated.tenantId,
        tenantName: updated.tenant.name,
        requisitionId: updated.id,
        requestedByName: updated.requestedByName ?? 'Solicitante',
        requestType: updated.requestType,
        departmentName: updated.departmentName,
        justification: updated.justification,
      })
      .catch(() => undefined);
    return updated;
  }

  async startQuotation(id: string) {
    const req = await this.findRequisition(id);
    if (req.status !== REQUISITION_STATUS.ENVIADA && req.status !== REQUISITION_STATUS.EM_COTACAO) {
      throw new BadRequestException('Requisição não está disponível para cotação.');
    }
    return this.prisma.purchaseRequisition.update({
      where: { id },
      data: { status: REQUISITION_STATUS.EM_COTACAO },
      include: requisitionInclude,
    });
  }

  async addQuote(
    requisitionId: string,
    input: {
      supplierId?: string;
      supplierName: string;
      items: Array<{ description: string; quantity: number; unit?: string; unitPrice: number }>;
      totalAmount: number;
      deliveryDays?: number;
      notes?: string;
      attachmentUrl?: string;
    },
  ) {
    const req = await this.findRequisition(requisitionId);
    if (req.status !== REQUISITION_STATUS.EM_COTACAO) {
      throw new BadRequestException('Requisição não está em cotação.');
    }
    const settings = await this.getSettings(req.tenantId);
    const maxQuotes = settings.maxQuotes ?? DEFAULT_PURCHASE_SETTINGS.maxQuotes;
    if (req.quotes.length >= maxQuotes) {
      throw new BadRequestException(`Máximo de ${maxQuotes} cotações por requisição.`);
    }
    if (input.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({ where: { id: input.supplierId } });
      if (!supplier || supplier.tenantId !== req.tenantId) {
        throw new BadRequestException('Fornecedor inválido.');
      }
    }
    await this.prisma.purchaseQuote.create({
      data: {
        requisitionId,
        supplierId: input.supplierId ?? null,
        supplierName: cadastroUpperRequired(input.supplierName),
        items: input.items as object,
        totalAmount: input.totalAmount,
        deliveryDays: input.deliveryDays ?? null,
        notes: input.notes ?? null,
        attachmentUrl: input.attachmentUrl ?? null,
      },
    });
    return this.findRequisition(requisitionId);
  }

  async removeQuote(requisitionId: string, quoteId: string) {
    const req = await this.findRequisition(requisitionId);
    if (req.status !== REQUISITION_STATUS.EM_COTACAO) {
      throw new BadRequestException('Não é possível remover cotação neste status.');
    }
    const quote = req.quotes.find((q) => q.id === quoteId);
    if (!quote) throw new NotFoundException('Cotação não encontrada');
    await this.prisma.purchaseQuote.delete({ where: { id: quoteId } });
    if (req.selectedQuoteId === quoteId) {
      await this.prisma.purchaseRequisition.update({
        where: { id: requisitionId },
        data: { selectedQuoteId: null, approvedTotal: null },
      });
    }
    return this.findRequisition(requisitionId);
  }

  async selectQuote(requisitionId: string, quoteId: string) {
    const req = await this.findRequisition(requisitionId);
    if (req.status !== REQUISITION_STATUS.EM_COTACAO) {
      throw new BadRequestException('Selecione a cotação vencedora durante a fase de cotação.');
    }
    const quote = req.quotes.find((q) => q.id === quoteId);
    if (!quote) throw new NotFoundException('Cotação não encontrada');
    await this.prisma.$transaction([
      this.prisma.purchaseQuote.updateMany({
        where: { requisitionId },
        data: { isWinner: false },
      }),
      this.prisma.purchaseQuote.update({
        where: { id: quoteId },
        data: { isWinner: true },
      }),
      this.prisma.purchaseRequisition.update({
        where: { id: requisitionId },
        data: {
          selectedQuoteId: quoteId,
          approvedTotal: quote.totalAmount,
        },
      }),
    ]);
    return this.findRequisition(requisitionId);
  }

  async submitForApproval(requisitionId: string) {
    const req = await this.findRequisition(requisitionId);
    if (req.status !== REQUISITION_STATUS.EM_COTACAO) {
      throw new BadRequestException('Requisição deve estar em cotação.');
    }
    const settings = await this.getSettings(req.tenantId);
    const minQuotes = settings.minQuotes ?? DEFAULT_PURCHASE_SETTINGS.minQuotes;
    if (req.quotes.length < minQuotes) {
      throw new BadRequestException(`Informe no mínimo ${minQuotes} cotações.`);
    }
    if (!req.selectedQuoteId) {
      throw new BadRequestException('Selecione a cotação vencedora antes de enviar para aprovação.');
    }
    const total = req.approvedTotal ?? req.selectedQuote?.totalAmount ?? 0;
    const threshold = settings.approvalThresholdBrl ?? DEFAULT_PURCHASE_SETTINGS.approvalThresholdBrl;
    const nextStatus =
      total > threshold
        ? REQUISITION_STATUS.AGUARDANDO_FINANCEIRO
        : REQUISITION_STATUS.AGUARDANDO_FINANCEIRO;
    const updated = await this.prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: {
        status: nextStatus,
        approvedTotal: total,
      },
      include: requisitionInclude,
    });
    void this.notify
      .notifyPendingFinanceiro({
        tenantId: updated.tenantId,
        tenantName: updated.tenant.name,
        requisitionId: updated.id,
        requestedByName: updated.requestedByName ?? 'Solicitante',
        totalAmount: Number(total),
      })
      .catch(() => undefined);
    return updated;
  }

  async approve(requisitionId: string, role: 'financeiro' | 'diretoria', approver: { userId?: string; name: string }, notes?: string) {
    const req = await this.findRequisition(requisitionId);
    const settings = await this.getSettings(req.tenantId);
    const threshold = settings.approvalThresholdBrl ?? DEFAULT_PURCHASE_SETTINGS.approvalThresholdBrl;
    const total = req.approvedTotal ?? 0;

    if (role === APPROVAL_ROLE.FINANCEIRO) {
      if (req.status !== REQUISITION_STATUS.AGUARDANDO_FINANCEIRO) {
        throw new BadRequestException('Requisição não aguarda aprovação financeira.');
      }
      await this.prisma.purchaseApproval.create({
        data: {
          requisitionId,
          role: APPROVAL_ROLE.FINANCEIRO,
          approverUserId: approver.userId ?? null,
          approverName: cadastroUpperRequired(approver.name),
          decision: 'approved',
          notes: notes ?? null,
        },
      });
      const nextStatus =
        total > threshold
          ? REQUISITION_STATUS.AGUARDANDO_DIRETORIA
          : REQUISITION_STATUS.APROVADA;
      const updated = await this.prisma.purchaseRequisition.update({
        where: { id: requisitionId },
        data: { status: nextStatus },
        include: requisitionInclude,
      });
      if (nextStatus === REQUISITION_STATUS.AGUARDANDO_DIRETORIA) {
        void this.notify
          .notifyPendingDiretoria({
            tenantId: updated.tenantId,
            tenantName: updated.tenant.name,
            requestedByName: updated.requestedByName ?? 'Solicitante',
            totalAmount: Number(total),
          })
          .catch(() => undefined);
      }
      return updated;
    }

    if (req.status !== REQUISITION_STATUS.AGUARDANDO_DIRETORIA) {
      throw new BadRequestException('Requisição não aguarda aprovação da diretoria.');
    }
    await this.prisma.purchaseApproval.create({
      data: {
        requisitionId,
        role: APPROVAL_ROLE.DIRETORIA,
        approverUserId: approver.userId ?? null,
        approverName: cadastroUpperRequired(approver.name),
        decision: 'approved',
        notes: notes ?? null,
      },
    });
    return this.prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: { status: REQUISITION_STATUS.APROVADA },
      include: requisitionInclude,
    });
  }

  async reject(requisitionId: string, role: 'financeiro' | 'diretoria', approver: { userId?: string; name: string }, reason: string) {
    const req = await this.findRequisition(requisitionId);
    const validStatuses: string[] = [
      REQUISITION_STATUS.AGUARDANDO_FINANCEIRO,
      REQUISITION_STATUS.AGUARDANDO_DIRETORIA,
    ];
    if (!validStatuses.includes(req.status)) {
      throw new BadRequestException('Requisição não está aguardando aprovação.');
    }
    await this.prisma.purchaseApproval.create({
      data: {
        requisitionId,
        role,
        approverUserId: approver.userId ?? null,
        approverName: cadastroUpperRequired(approver.name),
        decision: 'rejected',
        notes: reason,
      },
    });
    return this.prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: {
        status: REQUISITION_STATUS.REPROVADA,
        rejectionReason: reason,
      },
      include: requisitionInclude,
    });
  }

  async createOrder(requisitionId: string) {
    const req = await this.findRequisition(requisitionId);
    if (req.status !== REQUISITION_STATUS.APROVADA) {
      throw new BadRequestException('Requisição precisa estar aprovada para gerar ordem de compra.');
    }
    if (!req.selectedQuote) {
      throw new BadRequestException('Cotação vencedora não definida.');
    }
    const quote = req.selectedQuote;
    const supplierId = quote.supplierId;
    if (!supplierId) {
      throw new BadRequestException('Cotação vencedora precisa de fornecedor cadastrado para gerar OP.');
    }
    const order = await this.prisma.purchaseOrder.create({
      data: {
        tenantId: req.tenantId,
        requisitionId,
        quoteId: quote.id,
        supplierId,
        items: quote.items as object,
        totalAmount: quote.totalAmount,
        status: 'sent',
        orderNumber: `OP-${Date.now().toString().slice(-8)}`,
      },
    });
    await this.prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: { status: REQUISITION_STATUS.EM_COMPRA },
    });
    return { requisition: await this.findRequisition(requisitionId), order };
  }

  async receiveGoods(
    requisitionId: string,
    input: {
      receivedByName: string;
      assetCategoryId?: string;
      location?: string;
    },
  ) {
    const req = await this.findRequisition(requisitionId);
    if (req.status !== REQUISITION_STATUS.EM_COMPRA) {
      throw new BadRequestException('Requisição deve estar em compra para registrar recebimento.');
    }
    const items = parseRequisitionItems(req.items);
    const order = req.purchaseOrders[0];
    const totalValue = req.approvedTotal ?? req.selectedQuote?.totalAmount ?? null;

    if (req.isPatrimonial) {
      if (!input.assetCategoryId) {
        throw new BadRequestException('Informe a categoria patrimonial para bens patrimoniais.');
      }
      const category = await this.prisma.assetCategory.findUnique({
        where: { id: input.assetCategoryId },
      });
      if (!category || category.tenantId !== req.tenantId) {
        throw new BadRequestException('Categoria patrimonial inválida.');
      }
      for (const item of items) {
        await this.prisma.asset.create({
          data: {
            tenantId: req.tenantId,
            categoryId: input.assetCategoryId,
            description: cadastroUpperRequired(item.description),
            location: cadastroUpper(input.location),
            responsibleName: req.requestedByName,
            acquisitionDate: new Date(),
            acquisitionValue: item.estimatedUnitPrice
              ? item.estimatedUnitPrice * item.quantity
              : totalValue
                ? totalValue / Math.max(items.length, 1)
                : null,
            status: 'em_uso',
            purchaseRequisitionId: requisitionId,
            purchaseOrderId: order?.id ?? null,
          },
        });
      }
    } else {
      for (const item of items) {
        if (!item.productId) continue;
        await this.stockMovements.create({
          productId: item.productId,
          quantity: item.quantity,
          type: 'purchase',
          unitPrice: item.estimatedUnitPrice,
          referenceType: 'requisition',
          referenceId: requisitionId,
          notes: `Recebimento requisição ${requisitionId}`,
        });
      }
    }

    if (order) {
      await this.prisma.purchaseOrder.update({
        where: { id: order.id },
        data: { status: 'received' },
      });
    }

    await this.prisma.purchaseReceipt.upsert({
      where: { requisitionId },
      create: {
        requisitionId,
        receivedByName: cadastroUpperRequired(input.receivedByName),
        signatureStatus: 'pending',
      },
      update: {
        receivedByName: cadastroUpperRequired(input.receivedByName),
        receivedAt: new Date(),
      },
    });

    return this.prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: { status: REQUISITION_STATUS.RECEBIDA_COMPRAS },
      include: requisitionInclude,
    });
  }

  async sendReceiptSignature(requisitionId: string, signerEmail: string, signerName?: string) {
    const req = await this.findRequisition(requisitionId);
    if (
      req.status !== REQUISITION_STATUS.RECEBIDA_COMPRAS &&
      req.status !== REQUISITION_STATUS.AGUARDANDO_ASSINATURA
    ) {
      throw new BadRequestException('Recebimento ainda não registrado.');
    }
    if (!this.helloSign.isConfigured()) {
      throw new BadRequestException('HelloSign não configurado.');
    }
    const normalizedSignerEmail = cadastroEmail(signerEmail);
    if (!normalizedSignerEmail) {
      throw new BadRequestException('E-mail do signatário é obrigatório.');
    }
    const normalizedSignerName = signerName ? cadastroUpperRequired(signerName) : null;
    const pdfBuffer = await this.buildReceiptPdf(req);
    const result = await this.helloSign.sendForSignature({
      fileBuffer: pdfBuffer,
      fileName: `Termo recebimento ${req.id.slice(-6)}.pdf`,
      agreementName: `Termo de recebimento — ${req.requestedByName}`,
      signerEmail: normalizedSignerEmail,
      signerName: normalizedSignerName ?? undefined,
      signatureField: { page: 1, x: 100, y: 650 },
    });

    await this.prisma.purchaseReceipt.upsert({
      where: { requisitionId },
      create: {
        requisitionId,
        signerEmail: normalizedSignerEmail,
        signerName: normalizedSignerName,
        helloSignRequestId: result.signatureRequestId,
        signatureStatus: 'sent',
        metadata: result.signingUrl ? { signingUrl: result.signingUrl } : {},
      },
      update: {
        signerEmail: normalizedSignerEmail,
        signerName: normalizedSignerName,
        helloSignRequestId: result.signatureRequestId,
        signatureStatus: 'sent',
        metadata: result.signingUrl ? { signingUrl: result.signingUrl } : {},
      },
    });

    return this.prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: { status: REQUISITION_STATUS.AGUARDANDO_ASSINATURA },
      include: requisitionInclude,
    });
  }

  async syncReceiptSignature(requisitionId: string) {
    const req = await this.findRequisition(requisitionId);
    const receipt = req.receipt;
    if (!receipt?.helloSignRequestId) {
      throw new BadRequestException('Termo não enviado para assinatura.');
    }
    const { status } = await this.helloSign.getSignatureRequestStatus(receipt.helloSignRequestId);
    const signed = ['signed', 'complete', 'closed'].includes(status.toLowerCase());
    if (signed) {
      await this.prisma.purchaseReceipt.update({
        where: { requisitionId },
        data: { signatureStatus: 'signed', signedAt: new Date() },
      });
      return this.prisma.purchaseRequisition.update({
        where: { id: requisitionId },
        data: { status: REQUISITION_STATUS.CONCLUIDA },
        include: requisitionInclude,
      });
    }
    return req;
  }

  private async buildReceiptPdf(req: Awaited<ReturnType<PurchaseWorkflowService['findRequisition']>>) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const items = parseRequisitionItems(req.items);
    let y = 740;
    const line = (text: string, size = 11, f = font) => {
      page.drawText(text.slice(0, 90), { x: 50, y, size, font: f, color: rgb(0, 0, 0) });
      y -= size + 6;
    };
    line('TERMO DE RECEBIMENTO DE MATERIAL', 14, bold);
    line(`Requisição: ${req.id}`);
    line(`Solicitante: ${req.requestedByName}`);
    if (req.requesterEmail) line(`E-mail: ${req.requesterEmail}`);
    line(`Empresa: ${req.tenant.name}`);
    line(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
    y -= 8;
    line('Itens recebidos:', 12, bold);
    for (const item of items) {
      line(`• ${item.description} — Qtd: ${item.quantity} ${item.unit ?? 'un'}`);
    }
    y -= 16;
    line('Declaro ter recebido o material acima em conformidade.', 11);
    line('Assinatura do solicitante:', 11, bold);
    return Buffer.from(await pdf.save());
  }
}
