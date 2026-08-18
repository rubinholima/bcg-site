import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FutebolAgendaService } from '../futebol-agenda/futebol-agenda.service';
import { CreateSocialPedagogyCaseDto } from './dto/create-social-pedagogy-case.dto';
import { UpdateSocialPedagogyCaseDto } from './dto/update-social-pedagogy-case.dto';
import {
  buildDefaultSchoolNotification,
  parseRegistrationProfile,
  validatePlayerContacts,
} from './social-pedagogy.util';
import {
  buildPlayerMatchAvailabilityInput,
  getPlayerMatchAvailability,
  type PlayerMatchAvailabilityInput,
} from '../common/player-match-availability.util';
import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
  normalizeSportsSituation,
} from '../common/sports-situation.util';

@Injectable()
export class SocialPedagogyCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agenda: FutebolAgendaService,
  ) {}

  private playerInclude = {
    player: {
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        category: true,
        tenantId: true,
        contactPhone: true,
        contactEmail: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactEmail: true,
        registrationProfile: true,
      },
    },
    tenant: { select: { id: true, name: true, slug: true } },
    documents: { orderBy: [{ createdAt: 'desc' as const }] },
  };

  async findByTenant(tenantId: string, status?: string, playerId?: string) {
    return this.prisma.socialPedagogyCase.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
        ...(playerId ? { playerId } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: this.playerInclude,
    });
  }

  async findByPlayer(playerId: string) {
    return this.prisma.socialPedagogyCase.findMany({
      where: { playerId },
      orderBy: [{ updatedAt: 'desc' }],
      include: this.playerInclude,
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.socialPedagogyCase.findUnique({
      where: { id },
      include: this.playerInclude,
    });
    if (!row) throw new NotFoundException('Caso não encontrado');
    return row;
  }

  private async buildAgendaSnapshot(playerId: string, from?: string, to?: string) {
    const agenda = await this.agenda.findPlayerAgenda(playerId, from, to);
    return Array.isArray(agenda) ? agenda : [];
  }

  private async buildContactValidation(playerId: string) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    const guardians = await this.prisma.playerGuardian.findMany({ where: { playerId } });
    return validatePlayerContacts(player, guardians);
  }

  async create(dto: CreateSocialPedagogyCaseDto, userId?: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: dto.playerId },
      include: { tenant: { select: { id: true, name: true } } },
    });
    if (!player || player.tenantId !== dto.tenantId) {
      throw new NotFoundException('Jogador não encontrado');
    }

    const contactValidation = await this.buildContactValidation(dto.playerId);
    const agendaSnapshot = await this.buildAgendaSnapshot(
      dto.playerId,
      dto.periodStart,
      dto.periodEnd,
    );

    const profile = parseRegistrationProfile(player.registrationProfile);
    const enrollment = await this.prisma.playerSchoolEnrollment.findFirst({
      where: { playerId: dto.playerId, status: 'ativo' },
      orderBy: [{ updatedAt: 'desc' }],
    });
    const schoolName = enrollment?.schoolName ?? profile.extras?.schoolName ?? 'Escola do atleta';
    const guardians = await this.prisma.playerGuardian.findMany({ where: { playerId: dto.playerId } });
    const primaryGuardian =
      guardians.find((g) => g.isPrimary)?.name ?? player.emergencyContactName ?? guardians[0]?.name ?? null;

    const events = (agendaSnapshot as Array<Record<string, unknown>>).slice(0, 12).map((item) => ({
      date: String(item.date ?? item.startDate ?? ''),
      title: String(item.title ?? item.name ?? 'Compromisso'),
      type: item.type ? String(item.type) : undefined,
      time: item.startTime ? String(item.startTime) : item.time ? String(item.time) : null,
    }));

    const schoolNotificationText =
      dto.triggerType === 'novo_atleta_apto'
        ? `Novo atleta apto — ${player.name}\n\nDocumentação confirmada e registro no BID concluído. Iniciar coleta de dados escolares, matrícula, responsáveis e arquivamento de documentos pedagógicos.`
        : buildDefaultSchoolNotification({
            tenantName: player.tenant?.name ?? 'Clube',
            playerName: player.name,
            schoolName,
            grade: enrollment?.grade ?? profile.extras?.schoolGrade ?? null,
            periodLabel: enrollment?.period ?? null,
            events,
            guardianName: primaryGuardian,
          });

    return this.prisma.socialPedagogyCase.create({
      data: {
        tenantId: dto.tenantId,
        playerId: dto.playerId,
        triggerType: dto.triggerType,
        triggerLabel: dto.triggerLabel ?? null,
        triggerRefType: dto.triggerRefType ?? null,
        triggerRefId: dto.triggerRefId ?? null,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
        contactValidation: contactValidation as unknown as Prisma.InputJsonValue,
        agendaSnapshot: agendaSnapshot as unknown as Prisma.InputJsonValue,
        schoolNotificationText,
        notes: dto.notes ?? null,
        createdByUserId: userId ?? null,
        status: contactValidation.ok ? 'agenda' : 'coleta',
      },
      include: this.playerInclude,
    });
  }

  async update(id: string, dto: UpdateSocialPedagogyCaseDto) {
    const current = await this.findOne(id);

    let contactValidation = current.contactValidation;
    if (dto.refreshContactValidation) {
      contactValidation = (await this.buildContactValidation(current.playerId)) as unknown as typeof contactValidation;
    }

    let agendaSnapshot = current.agendaSnapshot;
    if (dto.refreshAgenda) {
      agendaSnapshot = (await this.buildAgendaSnapshot(
        current.playerId,
        dto.periodStart ?? current.periodStart?.toISOString().slice(0, 10),
        dto.periodEnd ?? current.periodEnd?.toISOString().slice(0, 10),
      )) as unknown as typeof agendaSnapshot;
    }

    return this.prisma.socialPedagogyCase.update({
      where: { id },
      data: {
        ...(dto.status != null && { status: dto.status }),
        ...(dto.periodStart != null && { periodStart: new Date(dto.periodStart) }),
        ...(dto.periodEnd != null && { periodEnd: new Date(dto.periodEnd) }),
        ...(dto.schoolNotificationText !== undefined && {
          schoolNotificationText: dto.schoolNotificationText ?? null,
        }),
        ...(dto.schoolNotificationSentAt != null && {
          schoolNotificationSentAt: new Date(dto.schoolNotificationSentAt),
        }),
        ...(dto.schoolNotificationChannel !== undefined && {
          schoolNotificationChannel: dto.schoolNotificationChannel ?? null,
        }),
        ...(dto.schoolResponseNotes !== undefined && {
          schoolResponseNotes: dto.schoolResponseNotes ?? null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        ...(dto.refreshContactValidation && {
          contactValidation: contactValidation as Prisma.InputJsonValue,
        }),
        ...(dto.refreshAgenda && {
          agendaSnapshot: agendaSnapshot as Prisma.InputJsonValue,
        }),
      },
      include: this.playerInclude,
    });
  }

  async advanceStatus(id: string) {
    const current = await this.findOne(id);
    const flow = ['coleta', 'agenda', 'comunicacao', 'documentos', 'concluido'];
    const idx = flow.indexOf(current.status);
    if (idx < 0 || idx >= flow.length - 1) return current;
    return this.update(id, { status: flow[idx + 1] });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.socialPedagogyCase.delete({ where: { id } });
  }

  async listAptoNotifications(tenantId: string) {
    const rows = await this.prisma.socialPedagogyCase.findMany({
      where: {
        tenantId,
        triggerType: 'novo_atleta_apto',
        status: { not: 'concluido' },
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        player: {
          select: { id: true, name: true, jerseyNumber: true, category: true },
        },
      },
    });
    return {
      count: rows.length,
      items: rows.map((row) => ({
        caseId: row.id,
        playerId: row.playerId,
        playerName: row.player.name,
        jerseyNumber: row.player.jerseyNumber,
        category: row.player.category,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async tryCreateAptoPlayerCase(
    playerId: string,
    previousInput?: PlayerMatchAvailabilityInput,
    userId?: string,
  ) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { tenant: { select: { id: true, name: true } } },
    });
    if (!player) return null;

    const profile = parseRegistrationProfile(player.registrationProfile);
    const situation = normalizeSportsSituation(
      (profile as { sports?: { situation?: string } }).sports?.situation,
    );
    if (isArchivedSportsSituation(situation) || isLoanedSportsSituation(situation)) {
      return null;
    }

    const currentInput = buildPlayerMatchAvailabilityInput(player);
    const current = getPlayerMatchAvailability(currentInput);
    if (!current.apto) return null;

    const previous = previousInput
      ? getPlayerMatchAvailability(previousInput)
      : { apto: false, label: 'Não apto' as const, shortReason: null };
    if (previous.apto) return null;

    const existing = await this.prisma.socialPedagogyCase.findFirst({
      where: { playerId, triggerType: 'novo_atleta_apto' },
    });
    if (existing) return null;

    try {
      return await this.create(
        {
          tenantId: player.tenantId,
          playerId,
          triggerType: 'novo_atleta_apto',
          triggerLabel: 'Novo atleta apto (BID)',
          notes:
            'Atleta apto e registrado no BID. Iniciar matrícula escolar, contatos e documentação pedagógica.',
        },
        userId,
      );
    } catch {
      return null;
    }
  }
}
