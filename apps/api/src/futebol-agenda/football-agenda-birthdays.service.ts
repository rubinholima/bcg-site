import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function parseBirthDate(value: string): { month: number; day: number } | null {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const month = Number.parseInt(m[2], 10);
  const day = Number.parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

function birthdayOccurrence(year: number, month: number, day: number): Date {
  const maxDay = new Date(year, month, 0).getDate();
  const d = Math.min(day, maxDay);
  return new Date(Date.UTC(year, month - 1, d, 12, 0, 0));
}

@Injectable()
export class FootballAgendaBirthdaysService {
  private readonly log = new Logger(FootballAgendaBirthdaysService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Gera/atualiza aniversários a partir do cadastro de atletas (próximos ~13 meses). */
  async syncTenantBirthdays(tenantId: string): Promise<{ synced: number; removedLegacy: number }> {
    const now = new Date();
    const horizon = new Date(now);
    horizon.setMonth(horizon.getMonth() + 13);

    const players = await this.prisma.player.findMany({
      where: { tenantId, birthDate: { not: null } },
      select: { id: true, name: true, category: true, birthDate: true },
    });

    let synced = 0;
    for (const player of players) {
      if (!player.birthDate) continue;
      const parsed = parseBirthDate(player.birthDate);
      if (!parsed) continue;

      const years = new Set<number>([now.getFullYear(), horizon.getFullYear()]);
      for (const year of years) {
        const startAt = birthdayOccurrence(year, parsed.month, parsed.day);
        if (startAt < now || startAt > horizon) continue;

        const externalId = `player-birthday-${player.id}-${year}`;
        const title = `Aniversário — ${player.name.trim()}`;

        const existing = await this.prisma.footballAgendaEntry.findFirst({
          where: { tenantId, externalId },
        });

        const entry = existing
          ? await this.prisma.footballAgendaEntry.update({
              where: { id: existing.id },
              data: {
                category: player.category,
                type: 'aniversario',
                title,
                startAt,
                allDay: true,
                status: 'confirmado',
              },
            })
          : await this.prisma.footballAgendaEntry.create({
              data: {
                tenantId,
                externalId,
                category: player.category,
                type: 'aniversario',
                title,
                startAt,
                endAt: null,
                allDay: true,
                status: 'confirmado',
              },
            });

        const linked = await this.prisma.footballAgendaEntryParticipant.findFirst({
          where: { entryId: entry.id, playerId: player.id },
        });
        if (!linked) {
          await this.prisma.footballAgendaEntryParticipant.create({
            data: { entryId: entry.id, playerId: player.id },
          });
        }
        synced++;
      }
    }

    const removedLegacy = await this.cleanupLegacyBeatscodeBirthdays(tenantId);
    if (synced > 0 || removedLegacy > 0) {
      this.log.log(`Aniversários ${tenantId}: ${synced} sincronizado(s), ${removedLegacy} legado(s) removido(s)`);
    }
    return { synced, removedLegacy };
  }

  async syncPlayerBirthdays(playerId: string): Promise<void> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { tenantId: true },
    });
    if (!player) return;
    await this.syncTenantBirthdays(player.tenantId);
  }

  /** Remove entradas birthdate do Beatscode — fonte oficial é o cadastro do atleta. */
  private async cleanupLegacyBeatscodeBirthdays(tenantId: string): Promise<number> {
    const legacy = await this.prisma.footballAgendaEntry.findMany({
      where: {
        tenantId,
        OR: [
          { externalId: { startsWith: 'beatscode-birthdate-' } },
          {
            externalId: { startsWith: 'beatscode-schedule-' },
            type: { in: ['compromisso', 'aniversario'] },
            title: { not: { startsWith: 'Aniversário —' } },
            beatscodeMeta: { path: ['type'], equals: 'birthdate' },
          },
        ],
      },
      select: { id: true, beatscodeMeta: true, externalId: true, type: true, title: true },
    });

    const toDelete = legacy.filter((row) => {
      if (row.externalId?.startsWith('beatscode-birthdate-')) return true;
      const meta = row.beatscodeMeta as { type?: string } | null;
      return meta?.type === 'birthdate';
    });

    if (toDelete.length === 0) return 0;
    await this.prisma.footballAgendaEntry.deleteMany({
      where: { id: { in: toDelete.map((r) => r.id) } },
    });
    return toDelete.length;
  }
}
