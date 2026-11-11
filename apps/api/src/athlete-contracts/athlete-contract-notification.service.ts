import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { daysUntilEnd } from './athlete-contract-expiration.util';
import { buildAthleteContractDedupKey } from './athlete-contract-report.util';

const FED_PENDING = new Set(['PENDENTE', 'DOCUMENTOS_PENDENTES', 'EM_REGISTRO', 'AGUARDANDO_ASSINATURA', 'AGUARDANDO_TAXAS']);

@Injectable()
export class AthleteContractNotificationService {
  private readonly logger = new Logger(AthleteContractNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async runDailyNotifications(): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true, name: true }, take: 200 });
    for (const t of tenants) {
      try {
        await this.notifyTenant(t.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Falha avisos contratuais tenant ${t.id}: ${msg}`);
      }
    }
  }

  async notifyTenant(tenantId: string, bucket = new Date().toISOString().slice(0, 10)): Promise<number> {
    const systemUser =
      (await this.prisma.user.findFirst({
        where: { role: 'super_admin' },
        select: { id: true },
      })) ??
      (await this.prisma.user.findFirst({ select: { id: true } }));

    if (!systemUser) return 0;

    let created = 0;
    const contracts = await this.prisma.athleteContract.findMany({
      where: { tenantId, status: { in: ['ACTIVE', 'EXPIRING', 'PENDING_SIGNATURE'] } },
      include: { player: { select: { name: true } } },
    });

    for (const c of contracts) {
      const days = daysUntilEnd(c.endDate);
      if (days == null) continue;

      let kind: string | null = null;
      let title = '';
      let message = '';
      if (days < 0) {
        kind = 'contract_expired';
        title = `Contrato vencido — ${c.player.name}`;
        message = `O contrato do atleta ${c.player.name} venceu em ${c.endDate?.toISOString().slice(0, 10) ?? '—'}.`;
      } else if (days <= 30) {
        kind = 'contract_expiring';
        title = `Contrato vencendo — ${c.player.name}`;
        message = `Contrato de ${c.player.name} vence em ${days} dia(s).`;
      } else if (c.status === 'PENDING_SIGNATURE') {
        kind = 'signature_pending';
        title = `Assinatura pendente — ${c.player.name}`;
        message = `Contrato de ${c.player.name} aguarda assinatura.`;
      }

      if (!kind) continue;
      created += await this.emitAnnouncement({
        tenantId,
        kind,
        entityType: 'contract',
        entityId: c.id,
        targetCognitoSub: c.responsibleUserId,
        title,
        message,
        bucket,
        systemUserId: systemUser.id,
      });
    }

    const federatives = await this.prisma.athleteFederativeProcess.findMany({
      where: { tenantId, status: { in: [...FED_PENDING] } },
      include: { player: { select: { name: true } } },
    });
    for (const f of federatives) {
      created += await this.emitAnnouncement({
        tenantId,
        kind: 'federative_pending',
        entityType: 'federative',
        entityId: f.id,
        targetCognitoSub: f.responsibleUserId,
        title: `Federação pendente — ${f.player.name}`,
        message: `Processo federativo de ${f.player.name}: ${f.status}.`,
        bucket,
        systemUserId: systemUser.id,
      });
    }

    const docs = await this.prisma.athleteContractAttachment.findMany({
      where: { player: { tenantId } },
      include: { player: { select: { name: true } } },
      take: 500,
    });
    for (const d of docs) {
      if (!d.expirationDate) continue;
      const days = daysUntilEnd(d.expirationDate);
      if (days == null || days > 30) continue;
      created += await this.emitAnnouncement({
        tenantId,
        kind: days < 0 ? 'document_expired' : 'document_expiring',
        entityType: 'attachment',
        entityId: d.id,
        targetCognitoSub: null,
        title: `Documento ${days < 0 ? 'vencido' : 'vencendo'} — ${d.player.name}`,
        message: `Documento (${d.category}) do atleta ${d.player.name}.`,
        bucket,
        systemUserId: systemUser.id,
      });
    }

    const proCases = await this.prisma.athleteProfessionalizationCase.findMany({
      where: { tenantId, status: { in: ['PENDENTE', 'DOCUMENTOS_PENDENTES'] } },
      include: { player: { select: { name: true } } },
    });
    for (const p of proCases) {
      created += await this.emitAnnouncement({
        tenantId,
        kind: 'professionalization_pending',
        entityType: 'professionalization',
        entityId: p.id,
        targetCognitoSub: p.responsibleUserId,
        title: `Profissionalização pendente — ${p.player.name}`,
        message: `Caso de profissionalização de ${p.player.name}: ${p.status}.`,
        bucket,
        systemUserId: systemUser.id,
      });
    }

    return created;
  }

  private async emitAnnouncement(input: {
    tenantId: string;
    kind: string;
    entityType: string;
    entityId: string;
    targetCognitoSub: string | null | undefined;
    title: string;
    message: string;
    bucket: string;
    systemUserId: string;
  }): Promise<number> {
    const dedupKey = buildAthleteContractDedupKey({
      tenantId: input.tenantId,
      kind: input.kind,
      entityId: input.entityId,
      bucket: input.bucket,
    });

    const exists = await this.prisma.athleteContractNotificationDedup.findUnique({
      where: { dedupKey },
    });
    if (exists) return 0;

    let targetUserId: string | null = null;
    if (input.targetCognitoSub) {
      const u =
        (await this.prisma.user.findUnique({ where: { cognitoSub: input.targetCognitoSub } })) ??
        (await this.prisma.user.findUnique({ where: { id: input.targetCognitoSub } }));
      targetUserId = u?.id ?? null;
    }

    let announcementId: string | null = null;
    if (targetUserId) {
      const ann = await this.prisma.platformAnnouncement.create({
        data: {
          title: input.title,
          message: input.message,
          type: input.kind.includes('expired') ? 'danger' : 'warning',
          targetMode: 'user',
          targetUserId,
          dismissible: true,
          createdByUserId: input.systemUserId,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });
      announcementId = ann.id;
    }

    await this.prisma.athleteContractNotificationDedup.create({
      data: {
        tenantId: input.tenantId,
        dedupKey,
        kind: input.kind,
        entityType: input.entityType,
        entityId: input.entityId,
        targetUserId,
        announcementId,
      },
    });

    return 1;
  }
}
