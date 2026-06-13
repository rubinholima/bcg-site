import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isPlayableIptvStreamUrl } from './m3u-parser';

const MAX_VMIX_CHANNELS = 8;

@Injectable()
export class BostonTvVmixService {
  constructor(private readonly prisma: PrismaService) {}

  private assertTenant(
    allowedTenantIds: string[] | null,
    tenantId: string,
  ) {
    if (
      allowedTenantIds !== null &&
      !allowedTenantIds.includes(tenantId)
    ) {
      throw new ForbiddenException('Sem acesso a este tenant.');
    }
  }

  private normalizeDeliveryType(v: string | undefined | null): 'stream' | 'ndi' {
    return v === 'ndi' ? 'ndi' : 'stream';
  }

  async listChannels(
    tenantId: string,
    allowedTenantIds: string[] | null,
    enabledOnly = false,
  ) {
    this.assertTenant(allowedTenantIds, tenantId);
    const items = await this.prisma.bostonTvVmixChannel.findMany({
      where: {
        tenantId,
        ...(enabledOnly ? { enabled: true } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return {
      items: items.map((ch) => ({
        ...ch,
        playable:
          ch.deliveryType === 'ndi'
            ? Boolean(ch.ndiSourceName?.trim())
            : isPlayableIptvStreamUrl(ch.streamUrl),
      })),
      total: items.length,
    };
  }

  async createChannel(
    input: {
      tenantId: string;
      name: string;
      deliveryType?: string;
      streamUrl?: string;
      ndiSourceName?: string;
      sortOrder?: number;
      enabled?: boolean;
    },
    allowedTenantIds: string[] | null,
  ) {
    this.assertTenant(allowedTenantIds, input.tenantId);
    const deliveryType = this.normalizeDeliveryType(input.deliveryType);
    const streamUrl = (input.streamUrl ?? '').trim();
    const ndiSourceName = (input.ndiSourceName ?? '').trim();

    if (deliveryType === 'ndi') {
      if (!ndiSourceName) {
        throw new BadRequestException(
          'Informe o nome da fonte NDI (como aparece no vMix / NDI Tools).',
        );
      }
    } else if (!isPlayableIptvStreamUrl(streamUrl)) {
      throw new BadRequestException(
        'URL inválida. Use HLS (.m3u8) ou MPEG-TS do vMix (Output → stream).',
      );
    }

    const count = await this.prisma.bostonTvVmixChannel.count({
      where: { tenantId: input.tenantId },
    });
    if (count >= MAX_VMIX_CHANNELS) {
      throw new BadRequestException(
        `Limite de ${MAX_VMIX_CHANNELS} fontes vMix por clube.`,
      );
    }

    let sortOrder = input.sortOrder;
    if (sortOrder === undefined) {
      const agg = await this.prisma.bostonTvVmixChannel.aggregate({
        where: { tenantId: input.tenantId },
        _max: { sortOrder: true },
      });
      sortOrder = (agg._max.sortOrder ?? -1) + 1;
    }

    return this.prisma.bostonTvVmixChannel.create({
      data: {
        tenantId: input.tenantId,
        name: input.name.trim(),
        deliveryType,
        streamUrl: deliveryType === 'stream' ? streamUrl : '',
        ndiSourceName: deliveryType === 'ndi' ? ndiSourceName : null,
        sortOrder,
        enabled: input.enabled ?? true,
      },
    });
  }

  async updateChannel(
    channelId: string,
    input: {
      name?: string;
      deliveryType?: string;
      streamUrl?: string;
      ndiSourceName?: string;
      sortOrder?: number;
      enabled?: boolean;
    },
    allowedTenantIds: string[] | null,
  ) {
    const ch = await this.prisma.bostonTvVmixChannel.findUnique({
      where: { id: channelId },
    });
    if (!ch) throw new NotFoundException('Fonte vMix não encontrada.');
    this.assertTenant(allowedTenantIds, ch.tenantId);

    const deliveryType =
      input.deliveryType !== undefined
        ? this.normalizeDeliveryType(input.deliveryType)
        : this.normalizeDeliveryType(ch.deliveryType);

    const nextStreamUrl =
      input.streamUrl !== undefined ? input.streamUrl.trim() : ch.streamUrl;
    const nextNdiName =
      input.ndiSourceName !== undefined
        ? input.ndiSourceName.trim()
        : (ch.ndiSourceName ?? '');

    if (deliveryType === 'ndi') {
      if (!nextNdiName) {
        throw new BadRequestException('Nome da fonte NDI é obrigatório.');
      }
    } else if (!isPlayableIptvStreamUrl(nextStreamUrl)) {
      throw new BadRequestException(
        'URL inválida. Use HLS (.m3u8) ou MPEG-TS do vMix.',
      );
    }

    return this.prisma.bostonTvVmixChannel.update({
      where: { id: channelId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        deliveryType,
        streamUrl: deliveryType === 'stream' ? nextStreamUrl : '',
        ndiSourceName: deliveryType === 'ndi' ? nextNdiName : null,
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      },
    });
  }

  async deleteChannel(
    channelId: string,
    allowedTenantIds: string[] | null,
  ) {
    const ch = await this.prisma.bostonTvVmixChannel.findUnique({
      where: { id: channelId },
    });
    if (!ch) throw new NotFoundException('Fonte vMix não encontrada.');
    this.assertTenant(allowedTenantIds, ch.tenantId);
    await this.prisma.bostonTvVmixChannel.delete({ where: { id: channelId } });
    return { ok: true };
  }
}
