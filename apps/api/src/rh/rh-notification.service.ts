import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RhNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async notifyRhEvent(input: {
    tenantId: string;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
    targetUserId?: string | null;
    createdByUserId?: string | null;
  }): Promise<void> {
    const data: {
      title: string;
      message: string;
      type: string;
      targetMode: string;
      targetUserId: string | null;
      dismissible: boolean;
      createdByUserId: string;
      expiresAt: Date;
    } = {
      title: input.title,
      message: input.message,
      type: input.type ?? 'info',
      targetMode: input.targetUserId ? 'user' : 'all',
      targetUserId: input.targetUserId ?? null,
      dismissible: true,
      createdByUserId: input.createdByUserId ?? 'rh-system',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    await this.prisma.platformAnnouncement.create({ data });
  }
}
