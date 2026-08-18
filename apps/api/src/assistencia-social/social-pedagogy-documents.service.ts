import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSocialPedagogyDocumentDto,
  UpdateSocialPedagogyDocumentDto,
} from './dto/social-pedagogy-document.dto';

@Injectable()
export class SocialPedagogyDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string, playerId?: string, documentType?: string) {
    return this.prisma.socialPedagogyDocument.findMany({
      where: {
        player: { tenantId },
        ...(playerId ? { playerId } : {}),
        ...(documentType ? { documentType } : {}),
      },
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        player: { select: { id: true, name: true, jerseyNumber: true, category: true } },
        case: { select: { id: true, triggerType: true, status: true } },
      },
    });
  }

  async findByPlayer(playerId: string) {
    return this.prisma.socialPedagogyDocument.findMany({
      where: { playerId },
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      include: { case: { select: { id: true, triggerType: true, status: true } } },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.socialPedagogyDocument.findUnique({
      where: { id },
      include: {
        player: { select: { id: true, name: true, jerseyNumber: true, category: true, tenantId: true } },
        case: true,
      },
    });
    if (!row) throw new NotFoundException('Documento não encontrado');
    return row;
  }

  async create(dto: CreateSocialPedagogyDocumentDto) {
    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    if (dto.caseId) {
      const c = await this.prisma.socialPedagogyCase.findUnique({ where: { id: dto.caseId } });
      if (!c || c.playerId !== dto.playerId) throw new NotFoundException('Caso não encontrado');
    }
    return this.prisma.socialPedagogyDocument.create({
      data: {
        playerId: dto.playerId,
        caseId: dto.caseId ?? null,
        documentType: dto.documentType,
        name: dto.name,
        fileUrl: dto.fileUrl,
        schoolYear: dto.schoolYear ?? null,
        period: dto.period ?? null,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
        notes: dto.notes ?? null,
      },
      include: {
        player: { select: { id: true, name: true, jerseyNumber: true, category: true } },
        case: { select: { id: true, triggerType: true, status: true } },
      },
    });
  }

  async update(id: string, dto: UpdateSocialPedagogyDocumentDto) {
    await this.findOne(id);
    return this.prisma.socialPedagogyDocument.update({
      where: { id },
      data: {
        ...(dto.documentType != null && { documentType: dto.documentType }),
        ...(dto.name != null && { name: dto.name }),
        ...(dto.fileUrl != null && { fileUrl: dto.fileUrl }),
        ...(dto.schoolYear !== undefined && { schoolYear: dto.schoolYear ?? null }),
        ...(dto.period !== undefined && { period: dto.period ?? null }),
        ...(dto.receivedAt != null && { receivedAt: new Date(dto.receivedAt) }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
      },
      include: {
        player: { select: { id: true, name: true, jerseyNumber: true, category: true } },
        case: { select: { id: true, triggerType: true, status: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.socialPedagogyDocument.delete({ where: { id } });
  }
}
