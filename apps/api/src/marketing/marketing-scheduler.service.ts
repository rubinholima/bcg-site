import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MetaOAuthService } from '../integrations/meta/meta-oauth.service';

/**
 * Publica postagens com status `scheduled` e `scheduledAt` já passado (Facebook + Instagram conforme `platforms`).
 * Desative com META_SCHEDULER_DISABLED=1 se rodar múltiplas instâncias sem lock.
 */
@Injectable()
export class MarketingSchedulerService {
  private readonly log = new Logger(MarketingSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaOauth: MetaOAuthService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishDuePosts(): Promise<void> {
    if (process.env.META_SCHEDULER_DISABLED?.trim() === '1') return;

    const due = await this.prisma.marketingPost.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 25,
    });

    for (const row of due) {
      const platforms = (Array.isArray(row.platforms) ? row.platforms : []) as string[];
      const hasMeta = platforms.some((p) => {
        const x = String(p).toLowerCase();
        return x === 'facebook' || x === 'instagram';
      });
      if (!hasMeta) continue;
      try {
        await this.metaOauth.publishMarketingPostScheduled(row.id);
      } catch (e) {
        this.log.warn(`Marketing post ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
}
