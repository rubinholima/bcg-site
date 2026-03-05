import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarService } from './google-calendar.service';

export interface ConsultationItem {
  playerId: string;
  playerName: string;
  tenantName?: string;
  tenantLogoUrl?: string;
  date?: string;
  time?: string;
  type?: string;
  link?: string;
  notes?: string;
  status?: string;
}

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendar: GoogleCalendarService,
  ) {}

  async listAllConsultations(): Promise<Array<ConsultationItem & { id: string; tenantId: string }>> {
    const players = await this.prisma.player.findMany({
      include: { tenant: { select: { name: true, logoUrl: true } } },
    });

    const result: Array<ConsultationItem & { id: string; tenantId: string }> = [];

    for (const p of players) {
      const raw = p.onlineConsultations;
      const list = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
      if (list.length === 0) continue;
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const date = (c.date as string) ?? '';
        const status = (c.status as string) ?? 'scheduled';
        result.push({
          id: `${p.id}-${i}`,
          playerId: p.id,
          tenantId: p.tenantId,
          playerName: p.name,
          tenantName: p.tenant?.name,
          tenantLogoUrl: p.tenant?.logoUrl ?? undefined,
          date,
          time: (c.time as string) ?? undefined,
          type: (c.type as string) ?? 'meet',
          link: (c.link as string) ?? undefined,
          notes: (c.notes as string) ?? undefined,
          status,
        });
      }
    }

    result.sort((a, b) => {
      const da = a.date ? new Date(a.date + (a.time ? `T${a.time}` : 'T00:00')).getTime() : 0;
      const db = b.date ? new Date(b.date + (b.time ? `T${b.time}` : 'T00:00')).getTime() : 0;
      return da - db;
    });

    return result;
  }

  isGoogleMeetAvailable(): boolean {
    return this.googleCalendar.isAvailable();
  }

  async createMeetLink(params: {
    summary: string;
    description?: string;
    startDate: string;
    startTime?: string;
    endTime?: string;
    attendeeEmails?: string[];
  }) {
    return this.googleCalendar.createMeetEvent(params);
  }

  /** Remove uma consulta pelo id (formato playerId-index) */
  async removeConsultation(consultationId: string): Promise<boolean> {
    const match = consultationId.match(/^(.+)-(\d+)$/);
    if (!match) return false;
    const [, playerId, indexStr] = match;
    const index = parseInt(indexStr, 10);
    if (!playerId || isNaN(index) || index < 0) return false;

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { onlineConsultations: true },
    });
    if (!player) return false;

    const list = Array.isArray(player.onlineConsultations)
      ? (player.onlineConsultations as Record<string, unknown>[])
      : [];
    if (index >= list.length) return false;

    const next = list.filter((_, i) => i !== index);
    await this.prisma.player.update({
      where: { id: playerId },
      data: { onlineConsultations: next as object },
    });
    return true;
  }
}
