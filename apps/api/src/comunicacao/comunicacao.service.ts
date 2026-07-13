import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  COMMUNICATION_CHANNELS,
  COMMUNICATION_STATUSES,
  digitsOnly,
  previewText,
  type CommunicationChannelType,
  type CommunicationStatus,
} from './comunicacao.constants';

type Actor = { sub: string; name?: string | null; email?: string | null };

@Injectable()
export class ComunicacaoService {
  constructor(private readonly prisma: PrismaService) {}

  private actorLabel(actor?: Actor | null): string {
    return actor?.name?.trim() || actor?.email?.trim() || 'Sistema';
  }

  private async addActivity(
    conversationId: string,
    type: string,
    summary: string,
    actor?: Actor | null,
    payload?: Prisma.InputJsonValue,
  ) {
    await this.prisma.communicationActivity.create({
      data: {
        conversationId,
        type,
        summary,
        payload: payload ?? undefined,
        actorUserId: actor?.sub,
        actorName: actor ? this.actorLabel(actor) : 'Sistema',
      },
    });
  }

  /** Tenta vincular Customer / lead BCH pelo telefone ou e-mail. */
  private async resolveCrmLinks(input: {
    tenantId: string;
    contactPhone?: string | null;
    contactEmail?: string | null;
  }): Promise<{ customerId?: string; venuePipelineLeadId?: string }> {
    const phone = digitsOnly(input.contactPhone);
    const email = input.contactEmail?.trim().toLowerCase() || null;
    let customerId: string | undefined;
    let venuePipelineLeadId: string | undefined;

    if (phone || email) {
      const customers = await this.prisma.customer.findMany({
        where: { tenantId: input.tenantId },
        select: { id: true, phone: true, email: true },
        take: 500,
      });
      const match = customers.find((c) => {
        if (phone && digitsOnly(c.phone) === phone) return true;
        if (email && c.email?.trim().toLowerCase() === email) return true;
        return false;
      });
      if (match) customerId = match.id;
    }

    if (phone || email) {
      const leads = await this.prisma.venuePipelineLead.findMany({
        where: {
          OR: [
            phone ? { contactPhone: { contains: phone.slice(-8) } } : undefined,
            email ? { contactEmail: { equals: email, mode: 'insensitive' } } : undefined,
          ].filter(Boolean) as Prisma.VenuePipelineLeadWhereInput[],
        },
        select: { id: true },
        take: 1,
        orderBy: { updatedAt: 'desc' },
      });
      if (leads[0]) venuePipelineLeadId = leads[0].id;
    }

    return { customerId, venuePipelineLeadId };
  }

  async getStats(tenantId?: string) {
    const where: Prisma.CommunicationConversationWhereInput = tenantId
      ? { tenantId }
      : {};
    const [open, pending, unreadAgg, favorites] = await Promise.all([
      this.prisma.communicationConversation.count({ where: { ...where, status: 'open' } }),
      this.prisma.communicationConversation.count({ where: { ...where, status: 'pending' } }),
      this.prisma.communicationConversation.aggregate({
        where,
        _sum: { unreadCount: true },
      }),
      this.prisma.communicationConversation.count({ where: { ...where, isFavorite: true } }),
    ]);
    return {
      open,
      pending,
      unread: unreadAgg._sum.unreadCount ?? 0,
      favorites,
    };
  }

  async listConversations(filters: {
    tenantId?: string;
    status?: string;
    channelType?: string;
    search?: string;
    unreadOnly?: boolean;
    favoritesOnly?: boolean;
    assignedToUserId?: string;
  }) {
    const where: Prisma.CommunicationConversationWhereInput = {};
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.status && COMMUNICATION_STATUSES.includes(filters.status as CommunicationStatus)) {
      where.status = filters.status;
    }
    if (
      filters.channelType &&
      COMMUNICATION_CHANNELS.includes(filters.channelType as CommunicationChannelType)
    ) {
      where.channelType = filters.channelType;
    }
    if (filters.unreadOnly) where.unreadCount = { gt: 0 };
    if (filters.favoritesOnly) where.isFavorite = true;
    if (filters.assignedToUserId) where.assignedToUserId = filters.assignedToUserId;
    const q = filters.search?.trim();
    if (q) {
      where.OR = [
        { contactName: { contains: q, mode: 'insensitive' } },
        { contactPhone: { contains: q } },
        { contactEmail: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { lastMessagePreview: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.communicationConversation.findMany({
      where,
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        venuePipelineLead: {
          select: { id: true, contactName: true, companyName: true, stage: true },
        },
        tags: { include: { tag: true } },
        channelAccount: {
          select: { id: true, label: true, channelType: true, displayAddress: true },
        },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async getConversation(id: string) {
    const row = await this.prisma.communicationConversation.findUnique({
      where: { id },
      include: {
        customer: true,
        venuePipelineLead: true,
        tags: { include: { tag: true } },
        channelAccount: true,
        tenant: { select: { id: true, name: true, slug: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 200 },
        notes: { orderBy: { createdAt: 'desc' }, take: 50 },
        activities: { orderBy: { createdAt: 'desc' }, take: 80 },
      },
    });
    if (!row) throw new NotFoundException('Conversa não encontrada');
    return row;
  }

  async createConversation(
    body: {
      tenantId: string;
      channelType?: string;
      channelAccountId?: string;
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
      subject?: string;
      customerId?: string;
      venuePipelineLeadId?: string;
      initialMessage?: string;
    },
    actor?: Actor,
  ) {
    const tenantId = body.tenantId?.trim();
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório');
    const channelType = (body.channelType?.trim() || 'whatsapp') as string;
    if (!COMMUNICATION_CHANNELS.includes(channelType as CommunicationChannelType)) {
      throw new BadRequestException('Canal inválido');
    }

    const crm =
      body.customerId || body.venuePipelineLeadId
        ? {
            customerId: body.customerId,
            venuePipelineLeadId: body.venuePipelineLeadId,
          }
        : await this.resolveCrmLinks({
            tenantId,
            contactPhone: body.contactPhone,
            contactEmail: body.contactEmail,
          });

    const conversation = await this.prisma.communicationConversation.create({
      data: {
        tenantId,
        channelType,
        channelAccountId: body.channelAccountId || null,
        contactName: body.contactName?.trim() || null,
        contactPhone: body.contactPhone?.trim() || null,
        contactEmail: body.contactEmail?.trim() || null,
        subject: body.subject?.trim() || null,
        customerId: crm.customerId || null,
        venuePipelineLeadId: crm.venuePipelineLeadId || null,
        status: 'open',
      },
    });

    await this.addActivity(conversation.id, 'system', 'Conversa criada', actor);

    if (body.initialMessage?.trim()) {
      await this.addOutboundMessage(
        conversation.id,
        { body: body.initialMessage.trim() },
        actor,
      );
      return this.getConversation(conversation.id);
    }

    return this.getConversation(conversation.id);
  }

  async updateConversation(
    id: string,
    body: {
      status?: string;
      assignedToUserId?: string | null;
      assignedToName?: string | null;
      isFavorite?: boolean;
      subject?: string | null;
      contactName?: string | null;
      customerId?: string | null;
      venuePipelineLeadId?: string | null;
      linkedEntityType?: string | null;
      linkedEntityId?: string | null;
    },
    actor?: Actor,
  ) {
    const current = await this.prisma.communicationConversation.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Conversa não encontrada');

    const data: Prisma.CommunicationConversationUpdateInput = {};
    if (body.status !== undefined) {
      if (!COMMUNICATION_STATUSES.includes(body.status as CommunicationStatus)) {
        throw new BadRequestException('Status inválido');
      }
      data.status = body.status;
      if (body.status !== current.status) {
        await this.addActivity(
          id,
          'status_change',
          `Status: ${current.status} → ${body.status}`,
          actor,
          { from: current.status, to: body.status },
        );
      }
    }
    if (body.assignedToUserId !== undefined || body.assignedToName !== undefined) {
      data.assignedToUserId = body.assignedToUserId ?? null;
      data.assignedToName = body.assignedToName ?? null;
      await this.addActivity(
        id,
        'assignment',
        body.assignedToName
          ? `Atribuída a ${body.assignedToName}`
          : 'Atribuição removida',
        actor,
      );
    }
    if (body.isFavorite !== undefined) data.isFavorite = body.isFavorite;
    if (body.subject !== undefined) data.subject = body.subject;
    if (body.contactName !== undefined) data.contactName = body.contactName;
    if (body.customerId !== undefined) {
      data.customer = body.customerId
        ? { connect: { id: body.customerId } }
        : { disconnect: true };
      if (body.customerId) {
        await this.addActivity(id, 'link_crm', 'Vinculada a cliente (Customer)', actor, {
          customerId: body.customerId,
        });
      }
    }
    if (body.venuePipelineLeadId !== undefined) {
      data.venuePipelineLead = body.venuePipelineLeadId
        ? { connect: { id: body.venuePipelineLeadId } }
        : { disconnect: true };
      if (body.venuePipelineLeadId) {
        await this.addActivity(id, 'link_crm', 'Vinculada a lead (Boston City Hall)', actor, {
          venuePipelineLeadId: body.venuePipelineLeadId,
        });
      }
    }
    if (body.linkedEntityType !== undefined) data.linkedEntityType = body.linkedEntityType;
    if (body.linkedEntityId !== undefined) data.linkedEntityId = body.linkedEntityId;

    await this.prisma.communicationConversation.update({ where: { id }, data });
    return this.getConversation(id);
  }

  async markRead(id: string) {
    await this.prisma.communicationConversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
    return this.getConversation(id);
  }

  async addOutboundMessage(
    conversationId: string,
    body: { body: string; messageType?: string; mediaUrl?: string },
    actor?: Actor,
  ) {
    const conversation = await this.prisma.communicationConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');
    const text = body.body?.trim();
    if (!text && !body.mediaUrl) throw new BadRequestException('Mensagem vazia');

    const message = await this.prisma.communicationMessage.create({
      data: {
        conversationId,
        direction: 'outbound',
        messageType: body.messageType?.trim() || 'text',
        body: text || null,
        mediaUrl: body.mediaUrl || null,
        deliveryStatus: 'pending',
        sentByUserId: actor?.sub,
        sentByName: actor ? this.actorLabel(actor) : null,
      },
    });

    await this.prisma.communicationConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: message.createdAt,
        lastMessagePreview: previewText(text || '[mídia]'),
        status: conversation.status === 'closed' ? 'open' : conversation.status,
      },
    });

    await this.addActivity(conversationId, 'message', 'Mensagem enviada', actor);

    // Fase 1: persiste localmente. Envio real WhatsApp Cloud API na fase seguinte.
    return message;
  }

  async addNote(conversationId: string, body: string, actor?: Actor) {
    const text = body?.trim();
    if (!text) throw new BadRequestException('Nota vazia');
    const conversation = await this.prisma.communicationConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');

    const note = await this.prisma.communicationNote.create({
      data: {
        conversationId,
        body: text,
        createdByUserId: actor?.sub,
        createdByName: actor ? this.actorLabel(actor) : null,
      },
    });
    await this.addActivity(conversationId, 'note', 'Nota interna adicionada', actor);
    return note;
  }

  async listTags(tenantId: string) {
    return this.prisma.communicationTag.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createTag(tenantId: string, name: string, color?: string) {
    const n = name?.trim();
    if (!n) throw new BadRequestException('Nome da tag obrigatório');
    return this.prisma.communicationTag.create({
      data: { tenantId, name: n, color: color?.trim() || null },
    });
  }

  async setConversationTags(conversationId: string, tagIds: string[], actor?: Actor) {
    const conversation = await this.prisma.communicationConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');

    await this.prisma.$transaction([
      this.prisma.communicationConversationTag.deleteMany({ where: { conversationId } }),
      ...tagIds.map((tagId) =>
        this.prisma.communicationConversationTag.create({
          data: { conversationId, tagId },
        }),
      ),
    ]);
    await this.addActivity(conversationId, 'tag', 'Tags atualizadas', actor, { tagIds });
    return this.getConversation(conversationId);
  }

  async listChannelAccounts(tenantId?: string) {
    return this.prisma.communicationChannelAccount.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: [{ tenantId: 'asc' }, { channelType: 'asc' }, { label: 'asc' }],
    });
  }

  async upsertChannelAccount(body: {
    tenantId: string;
    channelType: string;
    label: string;
    externalId?: string;
    displayAddress?: string;
    isActive?: boolean;
  }) {
    const tenantId = body.tenantId?.trim();
    const channelType = body.channelType?.trim();
    const label = body.label?.trim();
    if (!tenantId || !channelType || !label) {
      throw new BadRequestException('tenantId, channelType e label são obrigatórios');
    }
    if (!COMMUNICATION_CHANNELS.includes(channelType as CommunicationChannelType)) {
      throw new BadRequestException('Canal inválido');
    }
    const externalId = body.externalId?.trim() || null;

    const existing = await this.prisma.communicationChannelAccount.findFirst({
      where: { tenantId, channelType, externalId },
    });
    if (existing) {
      return this.prisma.communicationChannelAccount.update({
        where: { id: existing.id },
        data: {
          label,
          displayAddress: body.displayAddress?.trim() || null,
          isActive: body.isActive ?? true,
        },
      });
    }
    return this.prisma.communicationChannelAccount.create({
      data: {
        tenantId,
        channelType,
        label,
        externalId,
        displayAddress: body.displayAddress?.trim() || null,
        isActive: body.isActive ?? true,
      },
    });
  }

  async listTemplates(tenantId: string, channelType?: string) {
    return this.prisma.communicationTemplate.findMany({
      where: {
        tenantId,
        ...(channelType ? { channelType } : {}),
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTemplate(body: {
    tenantId: string;
    channelType: string;
    name: string;
    body: string;
    externalName?: string;
  }) {
    if (!body.tenantId || !body.name?.trim() || !body.body?.trim()) {
      throw new BadRequestException('Dados do template incompletos');
    }
    return this.prisma.communicationTemplate.create({
      data: {
        tenantId: body.tenantId,
        channelType: body.channelType || 'whatsapp',
        name: body.name.trim(),
        body: body.body.trim(),
        externalName: body.externalName?.trim() || null,
      },
    });
  }

  /**
   * Ingestão de mensagem inbound (webhook WhatsApp Cloud API / futuros canais).
   * Idempotente por externalId.
   */
  async ingestInbound(input: {
    channelType: string;
    channelExternalId?: string;
    externalContactId: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    messageExternalId?: string;
    messageType?: string;
    body?: string;
    mediaUrl?: string;
    mediaMimeType?: string;
    tenantId?: string;
  }) {
    const channelType = input.channelType || 'whatsapp';
    let account = await this.prisma.communicationChannelAccount.findFirst({
      where: {
        channelType,
        ...(input.channelExternalId ? { externalId: input.channelExternalId } : {}),
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!account && input.tenantId) {
      account = await this.prisma.communicationChannelAccount.findFirst({
        where: { tenantId: input.tenantId, channelType, isActive: true },
      });
    }
    if (!account) {
      throw new BadRequestException(
        'Nenhuma conta de canal ativa encontrada para esta mensagem',
      );
    }

    if (input.messageExternalId) {
      const dup = await this.prisma.communicationMessage.findFirst({
        where: { externalId: input.messageExternalId },
      });
      if (dup) return { duplicate: true, messageId: dup.id };
    }

    let conversation = await this.prisma.communicationConversation.findFirst({
      where: {
        tenantId: account.tenantId,
        channelType,
        OR: [
          { externalContactId: input.externalContactId },
          ...(digitsOnly(input.contactPhone)
            ? [{ contactPhone: { contains: digitsOnly(input.contactPhone)! } }]
            : []),
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      const crm = await this.resolveCrmLinks({
        tenantId: account.tenantId,
        contactPhone: input.contactPhone || input.externalContactId,
        contactEmail: input.contactEmail,
      });
      conversation = await this.prisma.communicationConversation.create({
        data: {
          tenantId: account.tenantId,
          channelAccountId: account.id,
          channelType,
          externalContactId: input.externalContactId,
          contactName: input.contactName || null,
          contactPhone: input.contactPhone || input.externalContactId || null,
          contactEmail: input.contactEmail || null,
          customerId: crm.customerId || null,
          venuePipelineLeadId: crm.venuePipelineLeadId || null,
          status: 'open',
          unreadCount: 0,
        },
      });
      await this.addActivity(conversation.id, 'system', 'Conversa recebida pelo canal');
    }

    const message = await this.prisma.communicationMessage.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        messageType: input.messageType || 'text',
        body: input.body || null,
        mediaUrl: input.mediaUrl || null,
        mediaMimeType: input.mediaMimeType || null,
        externalId: input.messageExternalId || null,
        deliveryStatus: 'delivered',
      },
    });

    await this.prisma.communicationConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: message.createdAt,
        lastMessagePreview: previewText(input.body || '[mídia]'),
        unreadCount: { increment: 1 },
        status: conversation.status === 'closed' ? 'open' : conversation.status,
        contactName: input.contactName || conversation.contactName,
      },
    });

    await this.addActivity(conversation.id, 'message', 'Mensagem recebida');

    return { duplicate: false, conversationId: conversation.id, messageId: message.id };
  }
}
