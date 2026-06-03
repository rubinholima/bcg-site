import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { BeatscodeApiClient } from './beatscode-api.client';
import {
  BEATSCODE_AGENDA_EXPORT_VERSION,
  type BeatscodeAgendaExportFile,
  isBeatscodeAgendaExportFile,
} from './beatscode-agenda-export.types';
import {
  dedupeScheduleRows,
  mapBeatscodeScheduleRow,
} from './beatscode-agenda.mapper';
import { resolveBeatscodeCategoryKey } from './beatscode-category.util';
import {
  BeatscodeImportService,
  resolveBeatscodeTenantSlug,
} from './beatscode-import.service';
import { FutebolAgendaService } from '../futebol-agenda/futebol-agenda.service';
import { FootballAgendaBirthdaysService } from '../futebol-agenda/football-agenda-birthdays.service';

export const DEFAULT_BEATSCODE_AGENDA_EXPORT_PATH = 'data/beatscode-agenda-export.json';

export type BeatscodeAgendaImportResult = {
  importedAt: string;
  tenantSlug: string;
  source: 'beatscode_api' | 'export_file';
  categoriesProcessed: string[];
  entriesCreated: number;
  entriesUpdated: number;
  entriesSkipped: number;
  travelsCreated: number;
  travelsSkipped: number;
  errors: string[];
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

@Injectable()
export class BeatscodeAgendaImportService {
  private readonly log = new Logger(BeatscodeAgendaImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly beatscodeImport: BeatscodeImportService,
    private readonly agenda: FutebolAgendaService,
    private readonly birthdays: FootballAgendaBirthdaysService,
  ) {}

  async exportToFile(options?: {
    tenantSlug?: string;
    outputPath?: string;
  }): Promise<{ filePath: string; export: BeatscodeAgendaExportFile }> {
    const exportData = await this.fetchExportData(options);
    const rel = options?.outputPath?.trim() || DEFAULT_BEATSCODE_AGENDA_EXPORT_PATH;
    const filePath = resolve(process.cwd(), rel);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    this.log.log(
      `Beatscode agenda export: ${exportData.scheduleItems.length} item(ns) → ${filePath}`,
    );
    return { filePath, export: exportData };
  }

  async readExportFile(filePath: string): Promise<BeatscodeAgendaExportFile> {
    const abs = resolve(process.cwd(), filePath);
    const raw = JSON.parse(await readFile(abs, 'utf8')) as unknown;
    if (!isBeatscodeAgendaExportFile(raw)) {
      throw new Error(`Arquivo inválido: ${abs}. Esperado BeatscodeAgendaExportFile v1.`);
    }
    return raw;
  }

  async importFromExport(
    exportFile: BeatscodeAgendaExportFile,
    options?: { tenantSlug?: string },
  ): Promise<BeatscodeAgendaImportResult> {
    const tenantSlug = resolveBeatscodeTenantSlug(options?.tenantSlug ?? exportFile.tenantSlug);
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new Error(`Tenant não encontrado: ${tenantSlug}`);

    const playerByExternalId = await this.loadPlayerMap(tenant.id);
    const deduped = dedupeScheduleRows(exportFile.scheduleItems);

    let entriesCreated = 0;
    let entriesUpdated = 0;
    let entriesSkipped = 0;
    let travelsCreated = 0;
    let travelsSkipped = 0;
    const errors: string[] = [];

    for (const wrapped of deduped) {
      try {
        const mapped = mapBeatscodeScheduleRow(wrapped.item, wrapped.categoryKey);
        if (!mapped) continue;

        const { entry, travel } = mapped;

        let travelLogisticsId: string | null = null;
        if (travel) {
          const existingTravel = await this.prisma.travelLogistics.findFirst({
            where: { tenantId: tenant.id, externalId: travel.externalId },
          });
          if (existingTravel) {
            travelsSkipped++;
            travelLogisticsId = existingTravel.id;
          } else {
            const rooms = this.buildAccommodationRooms(travel.linkedPlayerExternalIds, playerByExternalId);
            const created = await this.prisma.travelLogistics.create({
              data: {
                tenantId: tenant.id,
                externalId: travel.externalId,
                category: travel.category,
                matchDate: travel.matchDate,
                opponentName: travel.opponentName,
                stadiumName: travel.stadiumName,
                city: travel.city,
                country: travel.country,
                championshipName: travel.championshipName,
                status: travel.status,
                notes: travel.notes,
                beatscodeMeta: travel.beatscodeMeta as Prisma.InputJsonValue,
                accommodationRooms: rooms.length ? (rooms as Prisma.InputJsonValue) : undefined,
              },
            });
            travelsCreated++;
            travelLogisticsId = created.id;
          }
        }

        /** Próximos jogos na agenda vêm da FMF — Beatscode não cria entradas tipo jogo. */
        if (entry.type === 'jogo') {
          continue;
        }

        const existingEntry = await this.prisma.footballAgendaEntry.findFirst({
          where: { tenantId: tenant.id, externalId: entry.externalId },
        });
        if (existingEntry) {
          const needsUpdate =
            existingEntry.type !== entry.type ||
            existingEntry.title !== entry.title ||
            existingEntry.allDay !== entry.allDay ||
            existingEntry.description !== entry.description;
          if (needsUpdate) {
            await this.prisma.footballAgendaEntry.update({
              where: { id: existingEntry.id },
              data: {
                type: entry.type,
                title: entry.title,
                allDay: entry.allDay,
                description: entry.description,
                beatscodeMeta: entry.beatscodeMeta as Prisma.InputJsonValue,
              },
            });
            entriesUpdated++;
          } else {
            entriesSkipped++;
          }
          continue;
        }

        if (entry.type === 'aniversario') {
          const playerName = entry.title.replace(/^Aniversário — /i, '').trim();
          const legacy = await this.prisma.footballAgendaEntry.findFirst({
            where: {
              tenantId: tenant.id,
              category: entry.category,
              startAt: entry.startAt,
              OR: [{ title: playerName }, { title: entry.title }],
            },
          });
          if (legacy) {
            await this.prisma.footballAgendaEntry.update({
              where: { id: legacy.id },
              data: {
                externalId: entry.externalId,
                type: entry.type,
                title: entry.title,
                allDay: entry.allDay,
                description: entry.description,
                beatscodeMeta: entry.beatscodeMeta as Prisma.InputJsonValue,
              },
            });
            entriesUpdated++;
            continue;
          }
        }

        await this.prisma.footballAgendaEntry.create({
          data: {
            tenantId: tenant.id,
            externalId: entry.externalId,
            category: entry.category,
            type: entry.type,
            title: entry.title,
            startAt: entry.startAt,
            endAt: entry.endAt,
            allDay: entry.allDay,
            location: entry.location,
            spaceId: entry.location
              ? await this.agenda.resolveSpaceForImport(tenant.id, entry.location)
              : null,
            description: entry.description,
            status: entry.status,
            travelLogisticsId,
            beatscodeMeta: entry.beatscodeMeta as Prisma.InputJsonValue,
          },
        });
        const createdEntry = await this.prisma.footballAgendaEntry.findFirst({
          where: { tenantId: tenant.id, externalId: entry.externalId },
        });
        if (createdEntry) {
          const playerIds = entry.linkedPlayerExternalIds
            .map((ext) => playerByExternalId.get(ext))
            .filter((id): id is string => Boolean(id));
          if (playerIds.length) {
            await this.agenda.linkParticipants(createdEntry.id, playerIds);
          }
        }
        entriesCreated++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${wrapped.categoryKey}: ${msg}`);
      }
    }

    const result: BeatscodeAgendaImportResult = {
      importedAt: new Date().toISOString(),
      tenantSlug,
      source: 'export_file',
      categoriesProcessed: exportFile.categoriesProcessed,
      entriesCreated,
      entriesUpdated,
      entriesSkipped,
      travelsCreated,
      travelsSkipped,
      errors,
    };

    await this.prisma.integrationConfig.upsert({
      where: { key: 'beatscode_agenda_import_last' },
      create: { key: 'beatscode_agenda_import_last', config: result as unknown as Prisma.InputJsonValue },
      update: { config: result as unknown as Prisma.InputJsonValue },
    });

    await this.birthdays.syncTenantBirthdays(tenant.id);

    return result;
  }

  async runImport(options?: { tenantSlug?: string }): Promise<BeatscodeAgendaImportResult> {
    const exportData = await this.fetchExportData(options);
    const result = await this.importFromExport(exportData, { tenantSlug: options?.tenantSlug });
    return { ...result, source: 'beatscode_api' };
  }

  private async fetchExportData(options?: { tenantSlug?: string }): Promise<BeatscodeAgendaExportFile> {
    const tenantSlug = resolveBeatscodeTenantSlug(options?.tenantSlug);
    const client = this.beatscodeImport.createClient();
    await client.login();

    const initial = await client.fetchInitialData('/schedule');
    const categoryTargets = initial.categories.map((c) => ({
      ...c,
      mapped: resolveBeatscodeCategoryKey(c.name),
    }));

    if (categoryTargets.length === 0) {
      throw new Error('Nenhuma categoria encontrada no Beatscode (rota /schedule).');
    }

    const scheduleItems: BeatscodeAgendaExportFile['scheduleItems'] = [];
    const competitions: BeatscodeAgendaExportFile['competitions'] = [];
    const categoriesProcessed: string[] = [];
    const errors: string[] = [];

    for (const cat of categoryTargets) {
      categoriesProcessed.push(`${cat.name} → ${cat.mapped}`);
      try {
        await client.setCategory(cat.id, '/schedule');
        await sleep(350);

        const rows = await client.listByPath('/schedule', '/schedule');
        this.log.log(`Beatscode agenda ${cat.name}: ${rows.length} item(ns)`);
        for (const item of rows) {
          scheduleItems.push({
            categoryKey: cat.mapped,
            beatscodeCategoryId: cat.id,
            beatscodeCategoryName: cat.name,
            item,
          });
        }

        const compRows = await client.listByPath('/competition', '/schedule');
        for (const item of compRows) {
          competitions.push({
            categoryKey: cat.mapped,
            beatscodeCategoryId: cat.id,
            beatscodeCategoryName: cat.name,
            item,
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${cat.name}: ${msg}`);
      }
    }

    return {
      version: BEATSCODE_AGENDA_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      apiUrl: client.getBaseUrl(),
      tenantSlug,
      categoriesProcessed,
      scheduleItems,
      competitions,
      errors,
    };
  }

  private async loadPlayerMap(tenantId: string): Promise<Map<string, string>> {
    const players = await this.prisma.player.findMany({
      where: { tenantId, externalId: { startsWith: 'beatscode-' } },
      select: { id: true, externalId: true, name: true },
    });
    const map = new Map<string, string>();
    for (const p of players) {
      if (p.externalId) map.set(p.externalId, p.id);
    }
    return map;
  }

  private buildAccommodationRooms(
    externalIds: string[],
    playerByExternalId: Map<string, string>,
  ): Array<{ personId: string; personName: string; personType: 'player' }> {
    const rooms: Array<{ personId: string; personName: string; personType: 'player' }> = [];
    for (const ext of externalIds) {
      const personId = playerByExternalId.get(ext);
      if (personId) {
        rooms.push({ personId, personName: ext, personType: 'player' });
      }
    }
    return rooms;
  }
}
