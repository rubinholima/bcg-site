import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isClubKind } from '../public/public.service';
import {
  buildFmfTravelExternalId,
  fmfMatchToStartISO,
} from './fmf-fixture.util';
import { isFmfTeamMatch } from './fmf-team-match.util';
import {
  FMF_SCRAPER_PRESET_KEYS,
  FMF_SCRAPER_PRESETS,
  type FmfScraperPresetKey,
} from './fmf-scraper.presets';
import { FmfScraperService, type FmfScraperStore } from './fmf-scraper.service';
import {
  FMF_SYNC_TENANT_DEFAULTS,
  FMF_SYNC_TENANT_SLUGS,
  isFmfSyncTenantSlug,
  parseTenantCategoryKeys,
} from './fmf-sync-tenants.config';

export type FmfTravelSyncResult = {
  syncedAt: string;
  tenants: Array<{
    tenantId: string;
    tenantSlug: string;
    created: number;
    updated: number;
    skippedPast: number;
    skippedHome: number;
  }>;
};

@Injectable()
export class FmfTravelSyncService {
  private readonly log = new Logger(FmfTravelSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fmfScraper: FmfScraperService,
  ) {}

  async syncAll(options?: { tenantId?: string }): Promise<FmfTravelSyncResult> {
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
    const tenants: FmfTravelSyncResult['tenants'] = [];
    const now = new Date();

    for (const tenant of targets) {
      let created = 0;
      let updated = 0;
      let skippedPast = 0;
      let skippedHome = 0;

      const presetKeys = this.resolvePresetKeys(store, tenant.categoryKeys);
      const aliases = this.resolveAliases(tenant.slug, tenant.name);

      for (const presetKey of presetKeys) {
        const snap = store.categories[presetKey];
        if (!snap) continue;

        for (const m of snap.matches) {
          if (m.status !== 'scheduled') continue;

          const isAway = isFmfTeamMatch(m.awayName, tenant.name, aliases);
          if (!isAway) {
            if (isFmfTeamMatch(m.homeName, tenant.name, aliases)) skippedHome++;
            continue;
          }

          const startISO = fmfMatchToStartISO(m);
          if (!startISO) continue;
          const matchDate = new Date(startISO);
          if (matchDate < now) {
            skippedPast++;
            continue;
          }

          const externalId = buildFmfTravelExternalId(presetKey, m);
          const opponentName = m.homeName.trim() || null;
          const championshipParts = [
            snap.name,
            m.phaseLabel?.trim(),
            m.roundNumber != null ? `Rodada ${m.roundNumber}` : '',
          ].filter(Boolean);
          const championshipName = championshipParts.join(' — ') || null;
          const stadiumName = m.venueText?.trim() || null;

          const meta = {
            source: 'fmf',
            presetKey,
            phaseLabel: m.phaseLabel,
            fmfJogoNumber: m.fmfJogoNumber,
            homeName: m.homeName,
            awayName: m.awayName,
            venueText: m.venueText,
            competitionName: snap.name,
          } satisfies Record<string, unknown>;

          const existing = await this.prisma.travelLogistics.findFirst({
            where: { tenantId: tenant.id, externalId },
          });

          if (existing) {
            if (existing.status === 'cancelado') continue;
            await this.prisma.travelLogistics.update({
              where: { id: existing.id },
              data: {
                category: snap.fixtureCategory,
                matchDate,
                opponentName,
                stadiumName,
                championshipName,
                country: existing.country?.trim() || 'Brasil',
                beatscodeMeta: meta as Prisma.InputJsonValue,
              },
            });
            updated++;
          } else {
            await this.prisma.travelLogistics.create({
              data: {
                tenantId: tenant.id,
                externalId,
                category: snap.fixtureCategory,
                matchDate,
                opponentName,
                stadiumName,
                city: null,
                country: 'Brasil',
                championshipName,
                status: 'planejamento',
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
        skippedPast,
        skippedHome,
      });
      this.log.log(
        `FMF→viagens ${tenant.slug}: +${created} ~${updated} past=${skippedPast} home=${skippedHome}`,
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
