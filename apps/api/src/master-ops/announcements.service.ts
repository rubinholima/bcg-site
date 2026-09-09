import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAnnouncementDto } from './dto/create-announcement.dto';
import type { UpdateAnnouncementDto } from './dto/update-announcement.dto';

function parseOptionalDate(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Data inválida.');
  return d;
}

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  private isActiveWindow(
    row: { startsAt: Date | null; expiresAt: Date | null },
    now: Date,
  ) {
    if (row.startsAt && row.startsAt > now) return false;
    if (row.expiresAt && row.expiresAt < now) return false;
    return true;
  }

  async listForMaster() {
    const rows = await this.prisma.platformAnnouncement.findMany({
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
        targetUser: { select: { id: true, name: true, username: true } },
        _count: { select: { receipts: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const now = new Date();
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type,
      targetMode: r.targetMode,
      targetUser: r.targetUser,
      dismissible: r.dismissible,
      startsAt: r.startsAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      createdBy: r.createdBy,
      receiptsCount: r._count.receipts,
      active: this.isActiveWindow(r, now),
    }));
  }

  async create(dto: CreateAnnouncementDto, createdByUserId: string) {
    if (dto.targetMode === 'user' && !dto.targetUserId) {
      throw new BadRequestException('Informe o usuário alvo.');
    }
    if (dto.targetMode === 'all' && dto.targetUserId) {
      throw new BadRequestException('Aviso global não deve ter usuário alvo.');
    }
    const startsAt = parseOptionalDate(dto.startsAt);
    const expiresAt = parseOptionalDate(dto.expiresAt);
    if (startsAt && expiresAt && startsAt > expiresAt) {
      throw new BadRequestException('Início deve ser anterior ao vencimento.');
    }
    return this.prisma.platformAnnouncement.create({
      data: {
        title: dto.title.trim(),
        message: dto.message.trim(),
        type: dto.type ?? 'info',
        targetMode: dto.targetMode,
        targetUserId: dto.targetMode === 'user' ? dto.targetUserId : null,
        dismissible: dto.dismissible ?? true,
        startsAt: startsAt ?? null,
        expiresAt: expiresAt ?? null,
        createdByUserId,
      },
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    const existing = await this.prisma.platformAnnouncement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Aviso não encontrado.');
    const targetMode = dto.targetMode ?? existing.targetMode;
    const targetUserId =
      dto.targetUserId !== undefined ? dto.targetUserId : existing.targetUserId;
    if (targetMode === 'user' && !targetUserId) {
      throw new BadRequestException('Informe o usuário alvo.');
    }
    const startsAt = parseOptionalDate(dto.startsAt);
    const expiresAt = parseOptionalDate(dto.expiresAt);
    return this.prisma.platformAnnouncement.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        message: dto.message?.trim(),
        type: dto.type,
        targetMode,
        targetUserId: targetMode === 'user' ? targetUserId : null,
        dismissible: dto.dismissible,
        startsAt,
        expiresAt,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.platformAnnouncement.delete({ where: { id } });
    return { ok: true };
  }

  async listActiveForUser(userId: string) {
    const now = new Date();
    const rows = await this.prisma.platformAnnouncement.findMany({
      where: {
        OR: [{ targetMode: 'all' }, { targetMode: 'user', targetUserId: userId }],
      },
      include: {
        receipts: { where: { userId } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const active = rows.filter((r) => this.isActiveWindow(r, now));
    const result: Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      dismissible: boolean;
      startsAt: string | null;
      expiresAt: string | null;
      deliveredAt: string;
      readAt: string | null;
    }> = [];
    for (const row of active) {
      let receipt = row.receipts[0];
      if (!receipt) {
        receipt = await this.prisma.platformAnnouncementReceipt.create({
          data: { announcementId: row.id, userId },
        });
      }
      if (receipt.dismissedAt) continue;
      result.push({
        id: row.id,
        title: row.title,
        message: row.message,
        type: row.type,
        dismissible: row.dismissible,
        startsAt: row.startsAt?.toISOString() ?? null,
        expiresAt: row.expiresAt?.toISOString() ?? null,
        deliveredAt: receipt.deliveredAt.toISOString(),
        readAt: receipt.readAt?.toISOString() ?? null,
      });
    }
    return result;
  }

  async markRead(userId: string, announcementId: string) {
    const receipt = await this.ensureReceipt(userId, announcementId);
    if (!receipt.readAt) {
      await this.prisma.platformAnnouncementReceipt.update({
        where: { id: receipt.id },
        data: { readAt: new Date() },
      });
    }
    return { ok: true };
  }

  async dismiss(userId: string, announcementId: string) {
    const announcement = await this.prisma.platformAnnouncement.findUnique({
      where: { id: announcementId },
    });
    if (!announcement) throw new NotFoundException('Aviso não encontrado.');
    if (!announcement.dismissible) {
      throw new BadRequestException('Este aviso não pode ser dispensado.');
    }
    const receipt = await this.ensureReceipt(userId, announcementId);
    await this.prisma.platformAnnouncementReceipt.update({
      where: { id: receipt.id },
      data: {
        readAt: receipt.readAt ?? new Date(),
        dismissedAt: new Date(),
      },
    });
    return { ok: true };
  }

  private async ensureReceipt(userId: string, announcementId: string) {
    const existing = await this.prisma.platformAnnouncementReceipt.findUnique({
      where: { announcementId_userId: { announcementId, userId } },
    });
    if (existing) return existing;
    return this.prisma.platformAnnouncementReceipt.create({
      data: { announcementId, userId },
    });
  }
}
