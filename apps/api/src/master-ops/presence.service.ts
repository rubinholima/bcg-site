import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PresenceHeartbeatDto } from './dto/presence-heartbeat.dto';
import {
  formatDurationMs,
  parseUserAgentLabels,
  PRESENCE_IDLE_MS,
  PRESENCE_STALE_MS,
  resolvePresenceStatus,
} from './presence.util';

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  async heartbeat(
    userId: string,
    role: string,
    dto: PresenceHeartbeatDto,
    userAgent?: string,
  ) {
    const now = new Date();
    const labels = parseUserAgentLabels(userAgent);
    const isActive = dto.isActive !== false;
    const existing = await this.prisma.userPresenceSession.findUnique({
      where: { sessionKey: dto.sessionKey },
    });

    if (existing && existing.userId !== userId) {
      await this.prisma.userPresenceSession.delete({ where: { id: existing.id } });
    }

    const data = {
      userId,
      role,
      tenantId: dto.tenantId || null,
      tenantLabel: dto.tenantLabel || null,
      currentPath: dto.currentPath || null,
      currentModule: dto.currentModule || null,
      currentPageTitle: dto.currentPageTitle || null,
      userAgent: userAgent || null,
      browserLabel: labels.browserLabel,
      deviceLabel: labels.deviceLabel,
      lastSeenAt: now,
      lastActivityAt: isActive ? now : undefined,
    };

    if (existing && existing.userId === userId) {
      await this.prisma.userPresenceSession.update({
        where: { id: existing.id },
        data: {
          ...data,
          lastActivityAt: isActive ? now : existing.lastActivityAt,
        },
      });
    } else {
      await this.prisma.userPresenceSession.create({
        data: {
          sessionKey: dto.sessionKey,
          ...data,
          lastActivityAt: now,
        },
      });
    }

    await this.pruneStaleSessions();
    return { ok: true };
  }

  async endSession(sessionKey: string, userId: string) {
    await this.prisma.userPresenceSession.deleteMany({
      where: { sessionKey, userId },
    });
    return { ok: true };
  }

  async listLiveUsers(query?: string) {
    const now = new Date();
    const minSeen = new Date(now.getTime() - PRESENCE_IDLE_MS);
    const sessions = await this.prisma.userPresenceSession.findMany({
      where: { lastSeenAt: { gte: minSeen } },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, role: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ lastActivityAt: 'desc' }],
    });

    const needle = query?.trim().toLowerCase();
    const items = sessions
      .map((s) => {
        const status = resolvePresenceStatus(s.lastActivityAt, s.lastSeenAt, now);
        if (!status) return null;
        const connectedMs = now.getTime() - s.startedAt.getTime();
        return {
          id: s.id,
          sessionKey: s.sessionKey,
          status,
          user: {
            id: s.user.id,
            name: s.user.name,
            username: s.user.username,
            email: s.user.email,
            role: s.user.role ?? s.role,
          },
          tenant: s.tenant
            ? { id: s.tenant.id, name: s.tenant.name, slug: s.tenant.slug }
            : s.tenantLabel
              ? { id: s.tenantId, name: s.tenantLabel, slug: null }
              : null,
          currentPath: s.currentPath,
          currentModule: s.currentModule,
          currentPageTitle: s.currentPageTitle,
          browserLabel: s.browserLabel,
          deviceLabel: s.deviceLabel,
          startedAt: s.startedAt.toISOString(),
          lastSeenAt: s.lastSeenAt.toISOString(),
          lastActivityAt: s.lastActivityAt.toISOString(),
          connectedDuration: formatDurationMs(connectedMs),
          connectedDurationMs: connectedMs,
        };
      })
      .filter((item): item is NonNullable<typeof item> => {
        if (!item) return false;
        if (!needle) return true;
        const hay = [
          item.user.name,
          item.user.username,
          item.user.email,
          item.user.role,
          item.tenant?.name,
          item.currentModule,
          item.currentPageTitle,
          item.currentPath,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      });

    return {
      total: items.length,
      online: items.filter((i) => i.status === 'online').length,
      idle: items.filter((i) => i.status === 'idle').length,
      items,
      asOf: now.toISOString(),
    };
  }

  private async pruneStaleSessions() {
    const cutoff = new Date(Date.now() - PRESENCE_STALE_MS);
    await this.prisma.userPresenceSession.deleteMany({
      where: { lastSeenAt: { lt: cutoff } },
    });
  }
}
