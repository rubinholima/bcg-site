import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseM3uFromResponse, isPlayableIptvStreamUrl } from './m3u-parser';
import type { Prisma } from '@prisma/client';

const BATCH_SIZE = 800;
const SYNC_FETCH_TIMEOUT_MS = 300_000;

@Injectable()
export class BostonTvIptvService {
  private readonly logger = new Logger(BostonTvIptvService.name);
  private readonly syncInFlight = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  async getSourceForTenantScoped(
    tenantId: string,
    allowedTenantIds: string[] | null,
  ) {
    this.assertTenant(allowedTenantIds, tenantId);
    return this.getSourceForTenant(tenantId);
  }

  private async getSourceForTenant(tenantId: string) {
    return this.prisma.bostonTvIptvSource.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertSource(input: {
    tenantId: string;
    playlistUrl: string;
    name?: string;
    allowedTenantIds: string[] | null;
  }) {
    this.assertTenant(input.allowedTenantIds, input.tenantId);
    const playlistUrl = input.playlistUrl.trim();
    if (!/^https?:\/\//i.test(playlistUrl)) {
      throw new BadRequestException('URL da playlist deve começar com http:// ou https://');
    }

    const existing = await this.getSourceForTenant(input.tenantId);
    if (existing) {
      return this.prisma.bostonTvIptvSource.update({
        where: { id: existing.id },
        data: {
          playlistUrl,
          ...(input.name?.trim() ? { name: input.name.trim() } : {}),
          syncStatus: 'idle',
          syncError: null,
        },
      });
    }

    return this.prisma.bostonTvIptvSource.create({
      data: {
        tenantId: input.tenantId,
        playlistUrl,
        name: input.name?.trim() || 'IPTV',
      },
    });
  }

  async startSync(sourceId: string, allowedTenantIds: string[] | null) {
    const source = await this.ensureSourceScope(sourceId, allowedTenantIds);
    if (this.syncInFlight.has(sourceId)) {
      return { ok: true, status: source.syncStatus, message: 'Sincronização já em andamento.' };
    }

    await this.prisma.bostonTvIptvSource.update({
      where: { id: sourceId },
      data: { syncStatus: 'syncing', syncError: null },
    });

    this.syncInFlight.add(sourceId);
    void this.runSync(sourceId).finally(() => this.syncInFlight.delete(sourceId));

    return { ok: true, status: 'syncing' };
  }

  async startSyncForTenant(tenantId: string, allowedTenantIds: string[] | null) {
    this.assertTenant(allowedTenantIds, tenantId);
    const source = await this.getSourceForTenant(tenantId);
    if (!source) {
      throw new NotFoundException('Cadastre a URL da lista M3U antes de sincronizar.');
    }
    return this.startSync(source.id, allowedTenantIds);
  }

  private async runSync(sourceId: string) {
    const source = await this.prisma.bostonTvIptvSource.findUnique({
      where: { id: sourceId },
    });
    if (!source) return;

    try {
      this.logger.log(`IPTV sync iniciado: ${sourceId}`);
      const res = await fetch(source.playlistUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(SYNC_FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': 'BCG-BostonTV/1.0' },
      });
      if (!res.ok) {
        throw new Error(`Falha ao baixar M3U: HTTP ${res.status}`);
      }

      await this.prisma.bostonTvIptvChannel.deleteMany({ where: { sourceId } });

      let batch: Prisma.BostonTvIptvChannelCreateManyInput[] = [];
      let sortOrder = 0;
      let total = 0;

      for await (const ch of parseM3uFromResponse(res)) {
        batch.push({
          sourceId,
          name: ch.name.slice(0, 500),
          groupTitle: ch.groupTitle?.slice(0, 250) ?? null,
          logoUrl: ch.logoUrl,
          streamUrl: ch.streamUrl,
          streamUrlHash: ch.streamUrlHash,
          tvgId: ch.tvgId?.slice(0, 120) ?? null,
          sortOrder: sortOrder++,
        });
        if (batch.length >= BATCH_SIZE) {
          await this.prisma.bostonTvIptvChannel.createMany({ data: batch });
          total += batch.length;
          batch = [];
        }
      }
      if (batch.length > 0) {
        await this.prisma.bostonTvIptvChannel.createMany({ data: batch });
        total += batch.length;
      }

      await this.prisma.bostonTvIptvSource.update({
        where: { id: sourceId },
        data: {
          syncStatus: 'done',
          syncError: null,
          channelCount: total,
          lastSyncedAt: new Date(),
        },
      });
      this.logger.log(`IPTV sync concluído: ${sourceId} — ${total} canais`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      this.logger.error(`IPTV sync falhou (${sourceId}): ${msg}`);
      await this.prisma.bostonTvIptvSource.update({
        where: { id: sourceId },
        data: { syncStatus: 'error', syncError: msg.slice(0, 2000) },
      });
    }
  }

  async searchChannels(input: {
    tenantId: string;
    q?: string;
    group?: string;
    page?: number;
    limit?: number;
    enabledOnly?: boolean;
    allowedTenantIds: string[] | null;
  }) {
    this.assertTenant(input.allowedTenantIds, input.tenantId);
    const source = await this.getSourceForTenant(input.tenantId);
    if (!source) {
      return { source: null, items: [], total: 0, page: 1, limit: 40 };
    }

    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.limit ?? 40));
    const skip = (page - 1) * limit;
    const q = input.q?.trim() ?? '';
    const group = input.group?.trim() ?? '';

    const where = {
      sourceId: source.id,
      ...(input.enabledOnly ? { enabledForSelection: true } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { groupTitle: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(group ? { groupTitle: { contains: group, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.bostonTvIptvChannel.findMany({
        where,
        orderBy: [{ groupTitle: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          groupTitle: true,
          logoUrl: true,
          streamUrl: true,
          enabledForSelection: true,
        },
      }),
      this.prisma.bostonTvIptvChannel.count({ where }),
    ]);

    return {
      source: {
        id: source.id,
        name: source.name,
        channelCount: source.channelCount,
        enabledCount: await this.prisma.bostonTvIptvChannel.count({
          where: { sourceId: source.id, enabledForSelection: true },
        }),
        syncStatus: source.syncStatus,
        syncError: source.syncError,
        lastSyncedAt: source.lastSyncedAt,
      },
      items: items.map((ch) => ({
        ...ch,
        playable: isPlayableIptvStreamUrl(ch.streamUrl),
      })),
      total,
      page,
      limit,
    };
  }

  async setChannelEnabled(
    channelId: string,
    enabled: boolean,
    allowedTenantIds: string[] | null,
  ) {
    const ch = await this.prisma.bostonTvIptvChannel.findUnique({
      where: { id: channelId },
      include: { source: { select: { tenantId: true } } },
    });
    if (!ch) throw new NotFoundException('Canal não encontrado');
    this.assertTenant(allowedTenantIds, ch.source.tenantId);
    if (enabled && !isPlayableIptvStreamUrl(ch.streamUrl)) {
      throw new BadRequestException(
        'Este canal aponta para um site (ex.: Prime Video), não para transmissão IPTV. Busque outro canal da lista (ex.: Globo, ESPN com link .ts ou .m3u8).',
      );
    }
    return this.prisma.bostonTvIptvChannel.update({
      where: { id: channelId },
      data: { enabledForSelection: enabled },
      select: {
        id: true,
        name: true,
        groupTitle: true,
        enabledForSelection: true,
      },
    });
  }

  async assertChannelEnabledForSelection(channelId: string, tenantId: string) {
    const ch = await this.prisma.bostonTvIptvChannel.findFirst({
      where: {
        id: channelId,
        source: { tenantId },
        enabledForSelection: true,
      },
    });
    if (!ch) {
      throw new BadRequestException(
        'Canal não liberado. Ative o canal na lista de canais liberados antes de usar na tela.',
      );
    }
    return ch;
  }

  async getChannelForTenant(channelId: string, tenantId: string) {
    return this.prisma.bostonTvIptvChannel.findFirst({
      where: {
        id: channelId,
        source: { tenantId },
      },
    });
  }

  private assertTenant(allowed: string[] | null, tenantId: string) {
    if (allowed !== null && !allowed.includes(tenantId)) {
      throw new BadRequestException('Empresa não permitida.');
    }
  }

  private async ensureSourceScope(id: string, allowed: string[] | null) {
    const row = await this.prisma.bostonTvIptvSource.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Fonte IPTV não encontrada');
    this.assertTenant(allowed, row.tenantId);
    return row;
  }
}
