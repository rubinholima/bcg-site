import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PrepLoadSyncService } from './prep-load-sync.service';
import { computeActualLoad } from './prep-load-minutes.util';

const TOKEN_TTL_DAYS = 14;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function publicAppBaseUrl(): string {
  return (
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://www.bostoncitygroup.biz'
  ).replace(/\/$/, '');
}

@Injectable()
export class PrepPseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loadSync: PrepLoadSyncService,
  ) {}

  psePublicUrl(token: string): string {
    return `${publicAppBaseUrl()}/pse/${token}`;
  }

  async ensureTokensForSession(sessionId: string): Promise<void> {
    const session = await this.prisma.coachTrainingSession.findUnique({
      where: { id: sessionId },
      include: { playerEntries: true },
    });
    if (!session || session.status !== 'finalizado') return;
    if (!session.category) return;

    const loadSessionId = await this.loadSync.syncForTrainingDay(
      session.tenantId,
      session.category,
      session.sessionDate,
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);

    for (const entry of session.playerEntries) {
      if (!entry.available) continue;
      const existing = await this.prisma.physiologySessionRpeToken.findFirst({
        where: {
          coachTrainingSessionId: sessionId,
          playerId: entry.playerId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (existing) {
        await this.prisma.physiologySessionRpeToken.update({
          where: { id: existing.id },
          data: { physiologyLoadSessionId: loadSessionId },
        });
        continue;
      }
      const token = randomBytes(32).toString('hex');
      await this.prisma.physiologySessionRpeToken.create({
        data: {
          tenantId: session.tenantId,
          playerId: entry.playerId,
          coachTrainingSessionId: sessionId,
          physiologyLoadSessionId: loadSessionId,
          tokenHash: hashToken(token),
          expiresAt,
        },
      });
    }
  }

  async createTokenLink(sessionId: string, playerId: string): Promise<{ url: string; token: string }> {
    const session = await this.prisma.coachTrainingSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    await this.prisma.physiologySessionRpeToken.updateMany({
      where: { coachTrainingSessionId: sessionId, playerId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);
    let loadSessionId = session.physiologyLoadSessionId;
    if (!loadSessionId && session.category) {
      loadSessionId = await this.loadSync.syncForTrainingDay(
        session.tenantId,
        session.category,
        session.sessionDate,
      );
    }

    await this.prisma.physiologySessionRpeToken.create({
      data: {
        tenantId: session.tenantId,
        playerId,
        coachTrainingSessionId: sessionId,
        physiologyLoadSessionId: loadSessionId,
        tokenHash: hashToken(token),
        expiresAt,
      },
    });

    return { token, url: this.psePublicUrl(token) };
  }

  async getPublicForm(token: string) {
    const row = await this.resolveToken(token);
    const player = await this.prisma.player.findUnique({
      where: { id: row.playerId },
      select: { id: true, name: true },
    });
    const session = await this.prisma.coachTrainingSession.findUnique({
      where: { id: row.coachTrainingSessionId },
      select: { sessionDate: true, category: true, location: true },
    });
    const submitted = await this.prisma.physiologySessionRpeSubmission.findFirst({
      where: {
        playerId: row.playerId,
        physiologyLoadSessionId: row.physiologyLoadSessionId ?? undefined,
      },
    });
    return {
      playerName: player?.name ?? 'Atleta',
      sessionDate: session?.sessionDate,
      category: session?.category,
      location: session?.location,
      alreadySubmitted: !!submitted,
      rpe: submitted?.rpe ?? null,
    };
  }

  async submitPublicPse(token: string, rpe: number) {
    if (!Number.isInteger(rpe) || rpe < 0 || rpe > 10) {
      throw new BadRequestException('PSE deve ser um número inteiro entre 0 e 10.');
    }
    const row = await this.resolveToken(token);
    if (!row.physiologyLoadSessionId) {
      throw new BadRequestException('Sessão de carga ainda não disponível.');
    }

    const entry = await this.prisma.physiologyLoadEntry.findUnique({
      where: {
        sessionId_playerId: {
          sessionId: row.physiologyLoadSessionId,
          playerId: row.playerId,
        },
      },
    });

    const trainingMinutes = entry?.trainingMinutes ?? null;
    const actualLoad = computeActualLoad(rpe, trainingMinutes);

    const submission = await this.prisma.physiologySessionRpeSubmission.upsert({
      where: {
        physiologyLoadSessionId_playerId: {
          physiologyLoadSessionId: row.physiologyLoadSessionId,
          playerId: row.playerId,
        },
      },
      create: {
        tenantId: row.tenantId,
        playerId: row.playerId,
        coachTrainingSessionId: row.coachTrainingSessionId,
        physiologyLoadSessionId: row.physiologyLoadSessionId,
        physiologyLoadEntryId: entry?.id ?? null,
        rpe,
        source: 'athlete',
      },
      update: {
        rpe,
        source: 'athlete',
        submittedAt: new Date(),
        coachTrainingSessionId: row.coachTrainingSessionId,
        physiologyLoadEntryId: entry?.id ?? null,
      },
    });

    await this.prisma.physiologyLoadEntry.upsert({
      where: {
        sessionId_playerId: {
          sessionId: row.physiologyLoadSessionId,
          playerId: row.playerId,
        },
      },
      create: {
        sessionId: row.physiologyLoadSessionId,
        playerId: row.playerId,
        present: true,
        rpe,
        trainingMinutes,
        actualLoad,
      },
      update: { rpe, actualLoad },
    });

    return { ok: true, submissionId: submission.id };
  }

  async importCsv(
    tenantId: string,
    rows: Array<{ email: string; sessionDate: string; category: string; rpe: number }>,
  ) {
    const batchId = randomBytes(8).toString('hex');
    let ok = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const player = await this.prisma.player.findFirst({
          where: {
            tenantId,
            contactEmail: { equals: row.email.trim(), mode: 'insensitive' },
          },
        });
        if (!player) {
          errors.push(`${row.email}: atleta não encontrado`);
          continue;
        }

        const loadSession = await this.prisma.physiologyLoadSession.findFirst({
          where: {
            tenantId,
            category: row.category.trim(),
            sessionDate: row.sessionDate.trim(),
            sessionType: 'treino',
          },
        });
        if (!loadSession) {
          errors.push(`${row.email}: sessão de carga ${row.sessionDate} não encontrada`);
          continue;
        }

        const entry = await this.prisma.physiologyLoadEntry.findUnique({
          where: { sessionId_playerId: { sessionId: loadSession.id, playerId: player.id } },
        });
        const trainingMinutes = entry?.trainingMinutes ?? null;
        const actualLoad = computeActualLoad(row.rpe, trainingMinutes);

        await this.prisma.physiologySessionRpeSubmission.upsert({
          where: {
            physiologyLoadSessionId_playerId: {
              physiologyLoadSessionId: loadSession.id,
              playerId: player.id,
            },
          },
          create: {
            tenantId,
            playerId: player.id,
            physiologyLoadSessionId: loadSession.id,
            physiologyLoadEntryId: entry?.id ?? null,
            rpe: row.rpe,
            source: 'csv_import',
            importBatchId: batchId,
          },
          update: {
            rpe: row.rpe,
            source: 'csv_import',
            importBatchId: batchId,
            submittedAt: new Date(),
          },
        });

        await this.prisma.physiologyLoadEntry.upsert({
          where: { sessionId_playerId: { sessionId: loadSession.id, playerId: player.id } },
          create: {
            sessionId: loadSession.id,
            playerId: player.id,
            present: true,
            rpe: row.rpe,
            trainingMinutes,
            actualLoad,
          },
          update: { rpe: row.rpe, actualLoad },
        });
        ok++;
      } catch {
        errors.push(`${row.email}: erro ao importar`);
      }
    }

    return { ok, errors, batchId };
  }

  async listPseStatus(sessionId: string) {
    const session = await this.prisma.coachTrainingSession.findUnique({
      where: { id: sessionId },
      include: {
        playerEntries: { include: { player: { select: { id: true, name: true, contactEmail: true } } } },
      },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    const loadId = session.physiologyLoadSessionId;
    const submissions = loadId
      ? await this.prisma.physiologySessionRpeSubmission.findMany({
          where: { physiologyLoadSessionId: loadId },
        })
      : [];
    const subMap = new Map(submissions.map((s) => [s.playerId, s]));

    return session.playerEntries
      .filter((e) => e.available)
      .map((e) => {
        const sub = subMap.get(e.playerId);
        return {
          playerId: e.playerId,
          name: e.player.name,
          contactEmail: e.player.contactEmail,
          submitted: !!sub,
          rpe: sub?.rpe ?? null,
          submittedAt: sub?.submittedAt?.toISOString() ?? null,
        };
      });
  }

  private async resolveToken(token: string) {
    if (!token?.trim()) throw new UnauthorizedException('Token inválido');
    const row = await this.prisma.physiologySessionRpeToken.findUnique({
      where: { tokenHash: hashToken(token.trim()) },
    });
    if (!row || row.revokedAt) throw new UnauthorizedException('Link inválido ou revogado');
    if (row.expiresAt < new Date()) throw new UnauthorizedException('Link expirado');
    return row;
  }
}
