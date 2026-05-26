import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowNotifyService } from './workflow-notify.service';

@Injectable()
export class TiSupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: WorkflowNotifyService,
  ) {}

  async findAll(tenantId?: string, status?: string) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (status?.trim()) where.status = status.trim();
    return this.prisma.tiSupportTicket.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.tiSupportTicket.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!row) throw new NotFoundException('Chamado não encontrado');
    return row;
  }

  async create(input: {
    tenantId: string;
    requestedByUserId?: string;
    requestedByName: string;
    subject: string;
    description?: string;
    priority?: string;
  }) {
    const ticket = await this.prisma.tiSupportTicket.create({
      data: {
        tenantId: input.tenantId,
        requestedByUserId: input.requestedByUserId ?? null,
        requestedByName: input.requestedByName.trim().toUpperCase(),
        subject: input.subject.trim().toUpperCase(),
        description: input.description ?? null,
        priority: input.priority ?? 'normal',
        status: 'aberto',
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    void this.notify
      .notifyNewTiTicket({
        tenantId: ticket.tenantId,
        tenantName: ticket.tenant.name,
        subject: ticket.subject,
        requestedByName: ticket.requestedByName,
        priority: ticket.priority,
        description: ticket.description,
      })
      .catch(() => undefined);
    return ticket;
  }

  async update(
    id: string,
    data: Partial<{
      status: string;
      assignedToName: string;
      resolutionNotes: string;
      priority: string;
    }>,
  ) {
    await this.findOne(id);
    return this.prisma.tiSupportTicket.update({
      where: { id },
      data: {
        ...(data.status != null && { status: data.status }),
        ...(data.assignedToName !== undefined && {
          assignedToName: data.assignedToName?.trim().toUpperCase() ?? null,
        }),
        ...(data.resolutionNotes !== undefined && { resolutionNotes: data.resolutionNotes }),
        ...(data.priority != null && { priority: data.priority }),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }
}
