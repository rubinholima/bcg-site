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

const ITEM_TYPES = ['image_url', 'video_url', 'youtube_video', 'iptv_stream'] as const;

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
    return {
      ...ctx.meta,
      items: ctx.items.map((it, index) => ({
        ...it,
        url: this.resolvePlayerItemUrl(it, playerToken, index),
      })),
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
    return this.prisma.bostonTvScreen.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        playlist: { select: { id: true, name: true } },
        iptvChannel: { select: { id: true, name: true, groupTitle: true } },
      },
    });
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
}
