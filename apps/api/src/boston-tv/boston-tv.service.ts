import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { isPlayableIptvStreamUrl } from './m3u-parser';
import {
  resolvePublicMediaUrl,
} from '../common/public-media-url.util';
import {
  BOSTON_TV_HALL_PLAYLIST_NAME,
  BOSTON_TV_HALL_TENANT_SLUG,
} from './boston-tv-hall.constants';
import {
  effectiveItemDurationMs,
  hallElapsedMs,
  hallLoopDurationMs,
  hallNextItemElapsedMs,
  hallPositionInLoop,
  type HallSyncItem,
} from './boston-tv-hall-sync.util';

const ITEM_TYPES = ['image_url', 'video_url', 'youtube_video', 'iptv_stream'] as const;

/** Ordena telas "1 - USA", "2 - …", "10 - …" numericamente. */
function bostonTvScreenSortNum(name: string): number {
  const m = /^(\d+)\s*-/.exec(name.trim());
  return m ? parseInt(m[1], 10) : 9999;
}

@Injectable()
export class BostonTvService {
  constructor(private readonly prisma: PrismaService) {}

  private newPlayerToken(): string {
    return randomBytes(24).toString('hex');
  }

  private validateItemType(t: string): asserts t is (typeof ITEM_TYPES)[number] {
    if (!ITEM_TYPES.includes(t as (typeof ITEM_TYPES)[number])) {
      throw new BadRequestException(
        `Tipo de item inválido. Use: ${ITEM_TYPES.join(', ')}`,
      );
    }
  }

  private validateItemDuration(
    contentType: string,
    durationSeconds: number | null | undefined,
  ) {
    if (contentType === 'image_url') {
      if (
        durationSeconds === undefined ||
        durationSeconds === null ||
        durationSeconds < 5
      ) {
        throw new BadRequestException(
          'Imagens precisam de durationSeconds (mínimo 5 segundos).',
        );
      }
    }
    if (contentType === 'iptv_stream') {
      // Canal ao vivo — sem duração fixa
      return;
    }
  }

  private parseWeekly(raw: unknown): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
    if (raw === undefined || raw === null) return Prisma.JsonNull;
    if (!Array.isArray(raw)) {
      throw new BadRequestException('weeklySchedule deve ser um array ou vazio.');
    }
    return raw as Prisma.InputJsonValue;
  }

  /** Payload público do player na TV — sem auth. */
  async getPublicPlayerPayload(playerToken: string) {
    const ctx = await this.buildPlayerContext(playerToken);
    const items = ctx.items.map((it, index) => ({
      ...it,
      url: this.resolvePlayerItemUrl(it, playerToken, index),
    }));
    const hallSync =
      ctx.meta.playlistId && ctx.tenantId
        ? await this.buildHallSyncPayload(ctx.tenantId, ctx.meta.playlistId, ctx.items)
        : null;
    return {
      ...ctx.meta,
      items,
      ...(hallSync ? { hallSync } : {}),
    };
  }

  private resolvePlayerItemUrl(
    item: { contentType: string; url: string },
    playerToken: string,
    index: number,
  ): string {
    if (item.contentType === 'image_url' || item.contentType === 'video_url') {
      return resolvePublicMediaUrl(item.url) || item.url;
    }
    if (item.contentType === 'iptv_stream') {
      // Sempre proxy: evita mixed content (HTTP em página HTTPS) e URLs expostas na TV.
      return `/api/public/boston-tv/play/${encodeURIComponent(playerToken)}/stream?i=${index}`;
    }
    return item.url;
  }

  async resolveIptvStreamUpstream(playerToken: string, itemIndex: number): Promise<string> {
    const ctx = await this.buildPlayerContext(playerToken);
    const item = ctx.items[itemIndex];
    if (!item || item.contentType !== 'iptv_stream') {
      throw new NotFoundException('Stream não encontrado para este item.');
    }
    if (!isPlayableIptvStreamUrl(item.url)) {
      throw new BadRequestException('Canal não é transmissão compatível com o player.');
    }
    return item.url;
  }

  private async buildPlayerContext(playerToken: string) {
    const screen = await this.prisma.bostonTvScreen.findUnique({
      where: { playerToken },
      include: {
        tenant: { select: { id: true, name: true } },
        iptvChannel: true,
        playlist: {
          include: {
            items: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
    if (!screen) {
      throw new NotFoundException('Tela não encontrada ou token inválido.');
    }

    const meta = {
      screenId: screen.id,
      screenName: screen.name,
      tenantName: screen.tenant.name,
      scheduleTimezone: screen.scheduleTimezone,
      weeklySchedule: screen.weeklySchedule ?? null,
    };

    if (screen.displayMode === 'iptv' && screen.iptvChannel) {
      const ch = screen.iptvChannel;
      return {
        meta: {
          ...meta,
          playlistId: null,
          playlistName: null,
          displayMode: 'iptv',
        },
        tenantId: screen.tenant.id,
        items: [
          {
            id: ch.id,
            contentType: 'iptv_stream',
            url: ch.streamUrl,
            durationSeconds: null,
            sortOrder: 0,
            channelName: ch.name,
          },
        ],
      };
    }

    const playlistItems = screen.playlist?.items ?? [];
    const iptvUrls = playlistItems
      .filter((it) => it.contentType === 'iptv_stream')
      .map((it) => it.url.trim());
    const channelByUrl = new Map<string, string>();
    if (iptvUrls.length > 0) {
      const channels = await this.prisma.bostonTvIptvChannel.findMany({
        where: {
          streamUrl: { in: iptvUrls },
          source: { tenantId: screen.tenant.id },
        },
        select: { streamUrl: true, name: true },
      });
      for (const ch of channels) {
        channelByUrl.set(ch.streamUrl, ch.name);
      }
    }

    return {
      meta: {
        ...meta,
        playlistId: screen.playlist?.id ?? null,
        playlistName: screen.playlist?.name ?? null,
        displayMode: 'playlist',
      },
      tenantId: screen.tenant.id,
      items: playlistItems.map((it) => ({
        id: it.id,
        contentType: it.contentType,
        url: it.url,
        durationSeconds: it.durationSeconds,
        sortOrder: it.sortOrder,
        channelName:
          it.contentType === 'iptv_stream'
            ? channelByUrl.get(it.url.trim())
            : undefined,
      })),
    };
  }

  /** Lista telas numeradas do Hall para a página de instalação (sem tokens). */
  async listHallInstallerScreens() {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: BOSTON_TV_HALL_TENANT_SLUG },
      select: { id: true },
    });
    if (!tenant) return [];

    const rows = await this.prisma.bostonTvScreen.findMany({
      where: { tenantId: tenant.id },
      select: { name: true, locationHint: true },
    });

    const screens = rows
      .map((row) => {
        const num = bostonTvScreenSortNum(row.name);
        if (num === 9999) return null;
        return {
          num,
          name: row.name,
          locationHint: row.locationHint,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return screens.sort((a, b) => a.num - b.num || a.name.localeCompare(b.name, 'pt-BR'));
  }

  /** Resolve token do player pela numeração da planilha (ex.: 1 → "1 - USA"). */
  async resolveHallScreenPlayerToken(num: number): Promise<string> {
    if (!Number.isInteger(num) || num < 1 || num > 999) {
      throw new BadRequestException('Número de tela inválido.');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: BOSTON_TV_HALL_TENANT_SLUG },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException('Hall não configurado.');
    }

    const screen = await this.prisma.bostonTvScreen.findFirst({
      where: {
        tenantId: tenant.id,
        name: { startsWith: `${num} - ` },
      },
      select: { playerToken: true, name: true },
    });
    if (!screen) {
      throw new NotFoundException(`Tela ${num} não encontrada.`);
    }

    return screen.playerToken;
  }

  async touchPlayer(playerToken: string) {
    const u = await this.prisma.bostonTvScreen.updateMany({
      where: { playerToken },
      data: { lastSeenAt: new Date() },
    });
    if (u.count === 0) throw new NotFoundException();
    return { ok: true };
  }

  /** --- Autenticado --- */

  async listPlaylists(
    tenantIds: string[] | null,
    tenantFilter: string | undefined,
  ) {
    const where =
      tenantFilter && tenantFilter.length > 0
        ? { tenantId: tenantFilter }
        : tenantIds?.length
          ? { tenantId: { in: tenantIds } }
          : {};
    return this.prisma.bostonTvPlaylist.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async listScreens(
    tenantIds: string[] | null,
    tenantFilter: string | undefined,
  ) {
    const where =
      tenantFilter && tenantFilter.length > 0
        ? { tenantId: tenantFilter }
        : tenantIds?.length
          ? { tenantId: { in: tenantIds } }
          : {};
    const rows = await this.prisma.bostonTvScreen.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        playlist: { select: { id: true, name: true } },
        iptvChannel: { select: { id: true, name: true, groupTitle: true } },
      },
    });
    return rows.sort(
      (a, b) =>
        bostonTvScreenSortNum(a.name) - bostonTvScreenSortNum(b.name) ||
        a.name.localeCompare(b.name, 'pt-BR'),
    );
  }

  async createPlaylist(input: {
    tenantId: string;
    name: string;
    allowedTenantIds: string[] | null;
  }) {
    this.assertTenant(input.allowedTenantIds, input.tenantId);
    return this.prisma.bostonTvPlaylist.create({
      data: {
        tenantId: input.tenantId,
        name: input.name.trim(),
      },
    });
  }

  async updatePlaylist(
    id: string,
    data: { name?: string },
    allowedTenantIds: string[] | null,
  ) {
    await this.ensurePlaylistScope(id, allowedTenantIds);
    return this.prisma.bostonTvPlaylist.update({
      where: { id },
      data: { ...(data.name != null ? { name: data.name.trim() } : {}) },
    });
  }

  async deletePlaylist(id: string, allowedTenantIds: string[] | null) {
    await this.ensurePlaylistScope(id, allowedTenantIds);
    await this.prisma.bostonTvPlaylist.delete({ where: { id } });
  }

  async getPlaylist(id: string, allowedTenantIds: string[] | null) {
    await this.ensurePlaylistScope(id, allowedTenantIds);
    return this.prisma.bostonTvPlaylist.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        tenant: { select: { id: true, name: true } },
      },
    });
  }

  async addPlaylistItem(
    playlistId: string,
    dto: {
      contentType: string;
      url: string;
      durationSeconds?: number;
      sortOrder?: number;
    },
    allowedTenantIds: string[] | null,
  ) {
    await this.ensurePlaylistScope(playlistId, allowedTenantIds);
    this.validateItemType(dto.contentType.trim());
    this.validateItemDuration(
      dto.contentType.trim(),
      dto.durationSeconds,
    );

    const contentType = dto.contentType.trim();
    if (contentType === 'iptv_stream' && !isPlayableIptvStreamUrl(dto.url)) {
      throw new BadRequestException(
        'Canal não é transmissão IPTV válida (ex.: link de site). Escolha um canal liberado com stream .ts ou .m3u8.',
      );
    }

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const agg = await this.prisma.bostonTvPlaylistItem.aggregate({
        where: { playlistId },
        _max: { sortOrder: true },
      });
      sortOrder = (agg._max.sortOrder ?? -1) + 1;
    }

    return this.prisma.bostonTvPlaylistItem.create({
      data: {
        playlistId,
        contentType: dto.contentType.trim(),
        url: dto.url.trim(),
        durationSeconds:
          dto.durationSeconds !== undefined ? dto.durationSeconds : null,
        sortOrder,
      },
    }).then(async (row) => {
      await this.bumpHallPlaylistChange(playlistId);
      return row;
    });
  }

  async updatePlaylistItem(
    playlistId: string,
    itemId: string,
    dto: {
      contentType?: string;
      url?: string;
      durationSeconds?: number | null;
      sortOrder?: number;
    },
    allowedTenantIds: string[] | null,
  ) {
    await this.ensurePlaylistScope(playlistId, allowedTenantIds);
    const item = await this.prisma.bostonTvPlaylistItem.findFirst({
      where: { id: itemId, playlistId },
    });
    if (!item) throw new NotFoundException('Item não encontrado');

    const nextType = (dto.contentType ?? item.contentType).trim();
    this.validateItemType(nextType);
    const nextDur =
      dto.durationSeconds !== undefined ? dto.durationSeconds : item.durationSeconds;
    this.validateItemDuration(nextType, nextDur);

    return this.prisma.bostonTvPlaylistItem.update({
      where: { id: itemId },
      data: {
        ...(dto.contentType != null ? { contentType: nextType } : {}),
        ...(dto.url != null ? { url: dto.url.trim() } : {}),
        ...(dto.durationSeconds !== undefined ? { durationSeconds: dto.durationSeconds } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    }).then(async (row) => {
      await this.bumpHallPlaylistChange(playlistId);
      return row;
    });
  }

  async deletePlaylistItem(
    playlistId: string,
    itemId: string,
    allowedTenantIds: string[] | null,
  ) {
    await this.ensurePlaylistScope(playlistId, allowedTenantIds);
    const item = await this.prisma.bostonTvPlaylistItem.findFirst({
      where: { id: itemId, playlistId },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    await this.prisma.bostonTvPlaylistItem.delete({ where: { id: itemId } });
    await this.bumpHallPlaylistChange(playlistId);
  }

  async createScreen(input: {
    tenantId: string;
    name: string;
    locationHint?: string;
    playlistId?: string | null;
    displayMode?: string;
    iptvChannelId?: string | null;
    scheduleTimezone?: string;
    weeklySchedule?: unknown;
    allowedTenantIds: string[] | null,
  }) {
    this.assertTenant(input.allowedTenantIds, input.tenantId);

    const displayMode =
      input.displayMode?.trim() === 'iptv' ? 'iptv' : 'playlist';

    let playlistId: string | undefined;
    if (displayMode === 'playlist' && input.playlistId) {
      const pl = await this.prisma.bostonTvPlaylist.findFirst({
        where: {
          id: input.playlistId,
          tenantId: input.tenantId,
        },
      });
      if (!pl) {
        throw new BadRequestException('Playlist não encontrada para esta empresa.');
      }
      playlistId = input.playlistId;
    }

    let iptvChannelId: string | undefined;
    if (displayMode === 'iptv') {
      if (!input.iptvChannelId) {
        throw new BadRequestException('Selecione um canal IPTV para esta tela.');
      }
      const ch = await this.prisma.bostonTvIptvChannel.findFirst({
        where: {
          id: input.iptvChannelId,
          source: { tenantId: input.tenantId },
          enabledForSelection: true,
        },
      });
      if (!ch) {
        throw new BadRequestException(
          'Canal não liberado. Libere o canal na lista IPTV antes de usar na tela.',
        );
      }
      iptvChannelId = ch.id;
    }

    return this.prisma.bostonTvScreen.create({
      data: {
        tenantId: input.tenantId,
        name: input.name.trim(),
        locationHint: input.locationHint?.trim() ?? null,
        playerToken: this.newPlayerToken(),
        displayMode,
        ...(playlistId ? { playlistId } : {}),
        ...(iptvChannelId ? { iptvChannelId } : {}),
        scheduleTimezone:
          input.scheduleTimezone?.trim() || 'America/Sao_Paulo',
        ...(input.weeklySchedule !== undefined
          ? {
              weeklySchedule:
                input.weeklySchedule === null || input.weeklySchedule === ''
                  ? Prisma.JsonNull
                  : (this.parseWeekly(input.weeklySchedule) as Prisma.InputJsonValue),
            }
          : {}),
      },
    });
  }

  async updateScreen(
    id: string,
    input: {
      name?: string;
      locationHint?: string | null;
      playlistId?: string | null;
      displayMode?: string;
      iptvChannelId?: string | null;
      scheduleTimezone?: string;
      weeklySchedule?: unknown;
    },
    allowedTenantIds: string[] | null,
  ) {
    const scr = await this.ensureScreenScope(id, allowedTenantIds);

    const data: Prisma.BostonTvScreenUpdateInput = {};

    if (input.name != null) data.name = input.name.trim();
    if (input.locationHint !== undefined) {
      data.locationHint =
        input.locationHint === '' || input.locationHint === null
          ? null
          : input.locationHint.trim();
    }
    if (input.scheduleTimezone != null && input.scheduleTimezone.length > 0) {
      data.scheduleTimezone = input.scheduleTimezone.trim();
    }
    if (input.weeklySchedule !== undefined) {
      data.weeklySchedule = this.parseWeekly(input.weeklySchedule);
    }

    if (input.displayMode !== undefined) {
      const mode = input.displayMode.trim() === 'iptv' ? 'iptv' : 'playlist';
      data.displayMode = mode;
      if (mode === 'playlist') {
        data.iptvChannel = { disconnect: true };
      }
      if (mode === 'iptv') {
        data.playlist = { disconnect: true };
      }
    }

    if (input.playlistId !== undefined) {
      if (input.playlistId === null) {
        data.playlist = { disconnect: true };
      } else {
        const pl = await this.prisma.bostonTvPlaylist.findFirst({
          where: {
            id: input.playlistId,
            tenantId: scr.tenantId,
          },
        });
        if (!pl) throw new BadRequestException('Playlist inválida.');
        data.playlist = { connect: { id: pl.id } };
        data.displayMode = 'playlist';
        data.iptvChannel = { disconnect: true };
      }
    }

    if (input.iptvChannelId !== undefined) {
      if (input.iptvChannelId === null) {
        data.iptvChannel = { disconnect: true };
      } else {
        const ch = await this.prisma.bostonTvIptvChannel.findFirst({
          where: {
            id: input.iptvChannelId,
            source: { tenantId: scr.tenantId },
            enabledForSelection: true,
          },
        });
        if (!ch) {
          throw new BadRequestException(
            'Canal não liberado. Libere o canal na lista IPTV antes de usar na tela.',
          );
        }
        data.iptvChannel = { connect: { id: ch.id } };
        data.displayMode = 'iptv';
        data.playlist = { disconnect: true };
      }
    }

    return this.prisma.bostonTvScreen.update({
      where: { id },
      data,
    });
  }

  async rotateScreenToken(
    id: string,
    allowedTenantIds: string[] | null,
  ) {
    await this.ensureScreenScope(id, allowedTenantIds);
    return this.prisma.bostonTvScreen.update({
      where: { id },
      data: { playerToken: this.newPlayerToken() },
    });
  }

  async deleteScreen(id: string, allowedTenantIds: string[] | null) {
    await this.ensureScreenScope(id, allowedTenantIds);
    await this.prisma.bostonTvScreen.delete({ where: { id } });
  }

  private assertTenant(
    allowed: string[] | null,
    tenantId: string,
  ) {
    if (allowed !== null && !allowed.includes(tenantId)) {
      throw new BadRequestException('Empresa não permitida.');
    }
  }

  private async ensurePlaylistScope(
    id: string,
    allowed: string[] | null,
  ) {
    const row = await this.prisma.bostonTvPlaylist.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Playlist não encontrada');
    this.assertTenant(allowed, row.tenantId);
    return row;
  }

  private async ensureScreenScope(id: string, allowed: string[] | null) {
    const row = await this.prisma.bostonTvScreen.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Tela não encontrada');
    this.assertTenant(allowed, row.tenantId);
    return row;
  }

  // ─── Canal Hall sincronizado ─────────────────────────────────────────────

  async ensureHallChannel(tenantId: string, playlistId: string) {
    await this.ensurePlaylistExistsForTenant(tenantId, playlistId);
    return this.prisma.bostonTvHallChannel.upsert({
      where: { tenantId },
      create: { tenantId, playlistId },
      update: { playlistId },
    });
  }

  async getHallChannelState(
    tenantId: string,
    allowedTenantIds: string[] | null,
  ) {
    this.assertTenant(allowedTenantIds, tenantId);

    let channel = await this.prisma.bostonTvHallChannel.findUnique({
      where: { tenantId },
      include: {
        playlist: {
          select: { id: true, name: true, items: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });

    if (!channel) {
      const hallPl = await this.prisma.bostonTvPlaylist.findFirst({
        where: { tenantId, name: BOSTON_TV_HALL_PLAYLIST_NAME },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
      if (hallPl) {
        await this.ensureHallChannel(tenantId, hallPl.id);
        channel = await this.prisma.bostonTvHallChannel.findUnique({
          where: { tenantId },
          include: {
            playlist: {
              select: { id: true, name: true, items: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        });
      }
    }

    if (!channel) {
      return {
        configured: false as const,
        tenantId,
        message:
          'Canal Hall não configurado. Crie a playlist "Hall — loop geral" ou vincule uma playlist ao canal.',
      };
    }

    const syncItems = channel.playlist.items.map((it) => ({
      contentType: it.contentType,
      durationSeconds: it.durationSeconds,
    }));

    return {
      configured: true as const,
      tenantId,
      playlistId: channel.playlistId,
      playlistName: channel.playlist.name,
      itemCount: channel.playlist.items.length,
      hallSync: this.computeHallSync(channel, syncItems),
    };
  }

  async hallChannelPlay(tenantId: string, allowedTenantIds: string[] | null) {
    this.assertTenant(allowedTenantIds, tenantId);
    const channel = await this.requireHallChannel(tenantId);
    if (!channel.isPaused) return this.getHallChannelState(tenantId, allowedTenantIds);

    const now = new Date();
    await this.prisma.bostonTvHallChannel.update({
      where: { tenantId },
      data: {
        isPaused: false,
        epochAt: new Date(now.getTime() - channel.pausedElapsedMs),
        pausedElapsedMs: 0,
      },
    });
    return this.getHallChannelState(tenantId, allowedTenantIds);
  }

  async hallChannelPause(tenantId: string, allowedTenantIds: string[] | null) {
    this.assertTenant(allowedTenantIds, tenantId);
    const channel = await this.requireHallChannelWithItems(tenantId);
    if (channel.isPaused) return this.getHallChannelState(tenantId, allowedTenantIds);

    const syncItems = channel.playlist.items.map((it) => ({
      contentType: it.contentType,
      durationSeconds: it.durationSeconds,
    }));
    const elapsed = hallElapsedMs(
      channel.epochAt,
      false,
      0,
    );

    await this.prisma.bostonTvHallChannel.update({
      where: { tenantId },
      data: {
        isPaused: true,
        pausedElapsedMs: elapsed,
      },
    });
    return this.getHallChannelState(tenantId, allowedTenantIds);
  }

  async hallChannelNext(tenantId: string, allowedTenantIds: string[] | null) {
    this.assertTenant(allowedTenantIds, tenantId);
    const channel = await this.requireHallChannelWithItems(tenantId);
    const syncItems = channel.playlist.items.map((it) => ({
      contentType: it.contentType,
      durationSeconds: it.durationSeconds,
    }));
    if (syncItems.length === 0) {
      throw new BadRequestException('Playlist do Canal Hall está vazia.');
    }

    const currentElapsed = hallElapsedMs(
      channel.epochAt,
      channel.isPaused,
      channel.pausedElapsedMs,
    );
    const nextElapsed = hallNextItemElapsedMs(syncItems, currentElapsed);
    const now = Date.now();

    if (channel.isPaused) {
      await this.prisma.bostonTvHallChannel.update({
        where: { tenantId },
        data: { pausedElapsedMs: nextElapsed },
      });
    } else {
      await this.prisma.bostonTvHallChannel.update({
        where: { tenantId },
        data: {
          epochAt: new Date(now - nextElapsed),
          pausedElapsedMs: 0,
        },
      });
    }
    return this.getHallChannelState(tenantId, allowedTenantIds);
  }

  async hallChannelRestart(tenantId: string, allowedTenantIds: string[] | null) {
    this.assertTenant(allowedTenantIds, tenantId);
    await this.requireHallChannel(tenantId);
    await this.prisma.bostonTvHallChannel.update({
      where: { tenantId },
      data: {
        epochAt: new Date(),
        isPaused: false,
        pausedElapsedMs: 0,
      },
    });
    return this.getHallChannelState(tenantId, allowedTenantIds);
  }

  private async buildHallSyncPayload(
    tenantId: string,
    playlistId: string,
    items: HallSyncItem[],
  ) {
    if (items.length === 0) return null;

    let channel = await this.prisma.bostonTvHallChannel.findFirst({
      where: { tenantId, playlistId },
    });

    if (!channel) {
      const pl = await this.prisma.bostonTvPlaylist.findFirst({
        where: { id: playlistId, tenantId, name: BOSTON_TV_HALL_PLAYLIST_NAME },
        select: { id: true },
      });
      if (!pl) return null;
      channel = await this.ensureHallChannel(tenantId, playlistId);
    }

    return this.computeHallSync(channel, items);
  }

  private computeHallSync(
    channel: {
      epochAt: Date;
      isPaused: boolean;
      pausedElapsedMs: number;
      playlistVersion: number;
    },
    items: HallSyncItem[],
  ) {
    const now = Date.now();
    const elapsed = hallElapsedMs(
      channel.epochAt,
      channel.isPaused,
      channel.pausedElapsedMs,
      now,
    );
    const { itemIndex, offsetMs } = hallPositionInLoop(items, elapsed);
    const current = items[itemIndex] ?? items[0];
    return {
      serverNow: new Date(now).toISOString(),
      paused: channel.isPaused,
      playlistVersion: channel.playlistVersion,
      itemIndex,
      offsetMs,
      itemDurationMs: current
        ? effectiveItemDurationMs(current)
        : 0,
      loopDurationMs: hallLoopDurationMs(items),
    };
  }

  private async bumpHallPlaylistChange(playlistId: string) {
    const channel = await this.prisma.bostonTvHallChannel.findFirst({
      where: { playlistId },
    });
    if (!channel) return;
    await this.prisma.bostonTvHallChannel.update({
      where: { id: channel.id },
      data: {
        playlistVersion: { increment: 1 },
        epochAt: new Date(),
        isPaused: false,
        pausedElapsedMs: 0,
      },
    });
  }

  private async requireHallChannel(tenantId: string) {
    const channel = await this.prisma.bostonTvHallChannel.findUnique({
      where: { tenantId },
    });
    if (!channel) {
      throw new NotFoundException(
        'Canal Hall não configurado para esta empresa.',
      );
    }
    return channel;
  }

  private async requireHallChannelWithItems(tenantId: string) {
    const channel = await this.prisma.bostonTvHallChannel.findUnique({
      where: { tenantId },
      include: {
        playlist: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (!channel) {
      throw new NotFoundException(
        'Canal Hall não configurado para esta empresa.',
      );
    }
    return channel;
  }

  private async ensurePlaylistExistsForTenant(
    tenantId: string,
    playlistId: string,
  ) {
    const pl = await this.prisma.bostonTvPlaylist.findFirst({
      where: { id: playlistId, tenantId },
    });
    if (!pl) throw new BadRequestException('Playlist inválida para esta empresa.');
  }
}
