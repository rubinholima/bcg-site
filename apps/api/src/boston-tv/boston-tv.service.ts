import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const ITEM_TYPES = ['image_url', 'video_url', 'youtube_video'] as const;

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
    const screen = await this.prisma.bostonTvScreen.findUnique({
      where: { playerToken },
      include: {
        tenant: { select: { id: true, name: true } },
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
    const items = screen.playlist?.items ?? [];
    return {
      screenId: screen.id,
      screenName: screen.name,
      tenantName: screen.tenant.name,
      scheduleTimezone: screen.scheduleTimezone,
      weeklySchedule: screen.weeklySchedule ?? null,
      playlistId: screen.playlist?.id ?? null,
      playlistName: screen.playlist?.name ?? null,
      items: items.map((it) => ({
        id: it.id,
        contentType: it.contentType,
        url: it.url,
        durationSeconds: it.durationSeconds,
        sortOrder: it.sortOrder,
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
    scheduleTimezone?: string;
    weeklySchedule?: unknown;
    allowedTenantIds: string[] | null,
  }) {
    this.assertTenant(input.allowedTenantIds, input.tenantId);

    let playlistId: string | undefined;
    if (input.playlistId) {
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

    return this.prisma.bostonTvScreen.create({
      data: {
        tenantId: input.tenantId,
        name: input.name.trim(),
        locationHint: input.locationHint?.trim() ?? null,
        playerToken: this.newPlayerToken(),
        ...(playlistId ? { playlistId } : {}),
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
