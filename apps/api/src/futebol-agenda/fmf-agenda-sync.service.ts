import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isClubKind } from '../public/public.service';
import {
  buildFmfExternalId,
  fmfMatchToStartISO,
} from '../fmf-scraper/fmf-fixture.util';
import { isFmfTeamMatch } from '../fmf-scraper/fmf-team-match.util';
import {
  FMF_SCRAPER_PRESET_KEYS,
  FMF_SCRAPER_PRESETS,
  type FmfScraperPresetKey,
} from '../fmf-scraper/fmf-scraper.presets';
import { FmfScraperService, type FmfScraperStore } from '../fmf-scraper/fmf-scraper.service';
import {
  FMF_SYNC_TENANT_DEFAULTS,
  FMF_SYNC_TENANT_SLUGS,
  isFmfSyncTenantSlug,
  parseTenantCategoryKeys,
} from '../fmf-scraper/fmf-sync-tenants.config';
import { FootballActivitySpacesService } from './football-activity-spaces.service';

export type FmfAgendaSyncResult = {
  syncedAt: string;
  tenants: Array<{
    tenantId: string;
    tenantSlug: string;
    created: number;
    updated: number;
    skippedLocked: number;
    skippedPast: number;
  }>;
};

@Injectable()
export class FmfAgendaSyncService {
  private readonly log = new Logger(FmfAgendaSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fmfScraper: FmfScraperService,
    private readonly spaces: FootballActivitySpacesService,
  ) {}

  async syncAll(options?: { tenantId?: string }): Promise<FmfAgendaSyncResult> {
    const status = await this.fmfScraper.getStatus();
    const store = status as FmfScraperStore;
    if (!store.updatedAt) {
      throw new Error('Nenhum dado FMF importado. Execute a importação FMF antes.');
    }

    const clubs = await this.listClubTenants();
    const targets = options?.tenantId
      ? clubs.filter((t) => t.id === options.tenantId)
      : clubs;

    if (options?.tenantId && targets.length === 0) {
      throw new Error('Clube não encontrado ou fora do sync FMF.');
    }

    const syncedAt = new Date().toISOString();
    const tenants: FmfAgendaSyncResult['tenants'] = [];
    const now = new Date();

    for (const tenant of targets) {
      await this.spaces.ensureDefaults(tenant.id);
      let created = 0;
      let updated = 0;
      let skippedLocked = 0;
      let skippedPast = 0;

      const presetKeys = this.resolvePresetKeys(store, tenant.categoryKeys);
      const aliases = this.resolveAliases(tenant.slug, tenant.name);

      for (const presetKey of presetKeys) {
        const snap = store.categories[presetKey];
        if (!snap) continue;

        for (const m of snap.matches) {
          if (m.status !== 'scheduled') continue;
          const startISO = fmfMatchToStartISO(m);
          if (!startISO) continue;
          const startAt = new Date(startISO);
          if (startAt < now) {
            skippedPast++;
            continue;
          }

          const isOurs =
            isFmfTeamMatch(m.homeName, tenant.name, aliases) ||
            isFmfTeamMatch(m.awayName, tenant.name, aliases);
          if (!isOurs) continue;

          const externalId = buildFmfExternalId(presetKey, m);
          const title = `${m.homeName.trim()} x ${m.awayName.trim()}`;
          const description = [snap.name, m.venueText?.trim()].filter(Boolean).join(' · ') || null;
          const spaceId = m.venueText?.trim()
            ? await this.spaces.resolveByName(tenant.id, m.venueText.trim())
            : null;

          const existing = await this.prisma.footballAgendaEntry.findFirst({
            where: { tenantId: tenant.id, externalId },
          });

          if (existing?.agendaLocked) {
            skippedLocked++;
            continue;
          }

          const meta = {
            source: 'fmf',
            presetKey,
            fmfJogoNumber: m.fmfJogoNumber,
            homeName: m.homeName,
            awayName: m.awayName,
            venueText: m.venueText,
            competitionName: snap.name,
          } satisfies Record<string, unknown>;

          if (existing) {
            await this.prisma.footballAgendaEntry.update({
              where: { id: existing.id },
              data: {
                category: snap.fixtureCategory,
                type: 'jogo',
                title,
                startAt,
                endAt: null,
                allDay: false,
                location: m.venueText?.trim() || null,
                spaceId,
                description,
                status: 'confirmado',
                beatscodeMeta: meta as Prisma.InputJsonValue,
              },
            });
            updated++;
          } else {
            await this.prisma.footballAgendaEntry.create({
              data: {
                tenantId: tenant.id,
                externalId,
                category: snap.fixtureCategory,
                type: 'jogo',
                title,
                startAt,
                endAt: null,
                allDay: false,
                location: m.venueText?.trim() || null,
                spaceId,
                description,
                status: 'confirmado',
                agendaLocked: false,
                beatscodeMeta: meta as Prisma.InputJsonValue,
              },
            });
            created++;
          }
        }
      }

      tenants.push({
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        created,
        updated,
        skippedLocked,
        skippedPast,
      });
      this.log.log(
        `FMF→agenda ${tenant.slug}: +${created} ~${updated} locked=${skippedLocked}`,
      );
    }

    return { syncedAt, tenants };
  }

  private async listClubTenants() {
    const rows = await this.prisma.tenant.findMany({
      where: { slug: { in: [...FMF_SYNC_TENANT_SLUGS] } },
      include: { kind: { select: { name: true } } },
    });
    return rows
      .filter((t) => isClubKind(t.kind?.name ?? null))
      .map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        categoryKeys: parseTenantCategoryKeys(t.categories),
      }));
  }

  private resolveAliases(tenantSlug: string, tenantName: string): string[] {
    if (isFmfSyncTenantSlug(tenantSlug)) {
      return FMF_SYNC_TENANT_DEFAULTS[tenantSlug].fmfTeamNames;
    }
    return [tenantName];
  }

  private resolvePresetKeys(
    store: FmfScraperStore,
    tenantCategoryKeys: string[],
  ): FmfScraperPresetKey[] {
    const available = FMF_SCRAPER_PRESET_KEYS.filter((k) => store.categories[k]);
    if (tenantCategoryKeys.length === 0) return available;
    const wanted = new Set(tenantCategoryKeys);
    const matched = available.filter((k) =>
      wanted.has(FMF_SCRAPER_PRESETS[k].fixtureCategory),
    );
    return matched.length > 0 ? matched : available;
  }
}
