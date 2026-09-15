import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { mergeTravelBeatscodeMeta } from '../common/travel-beatscode-meta.util';
import { isClubKind } from '../public/public.service';
import {
  buildFmfTravelExternalId,
  fmfExternalIdCandidates,
  fmfMatchToStartISO,
  resolveFmfPresetKeys,
} from './fmf-fixture.util';
import { toOperationalCategory } from './fmf-operational-category.util';
import { loadFmfPresetExtensionMap, mergeFmfPresetMaps } from './fmf-preset-registry.util';
import { isFmfTeamMatch } from './fmf-team-match.util';
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
    const extensions = await loadFmfPresetExtensionMap(this.prisma);
    const presetMap = mergeFmfPresetMaps(extensions);

    for (const tenant of targets) {
      let created = 0;
      let updated = 0;
      let skippedPast = 0;
      let skippedHome = 0;

      const aliases = this.resolveAliases(tenant.slug, tenant.name);
      const presetKeys = resolveFmfPresetKeys(store, tenant.categoryKeys, {
        presetMap,
        club: { tenantName: tenant.name, aliases },
      });

      for (const presetKey of presetKeys) {
        const snap = store.categories[presetKey];
        if (!snap) continue;

        for (const m of snap.matches) {
          if (m.status !== 'scheduled') continue;

          const isHome = isFmfTeamMatch(m.homeName, tenant.name, aliases);
          const isAway = isFmfTeamMatch(m.awayName, tenant.name, aliases);
          if (!isHome && !isAway) continue;
          if (isHome && isAway) continue;

          const startISO = fmfMatchToStartISO(m);
          if (!startISO) continue;
          const matchDate = new Date(startISO);
          if (matchDate < now) {
            skippedPast++;
            continue;
          }

          const preset = presetMap[presetKey];
          const fmfD = snap.fmfD ?? preset?.fmfD ?? 0;
          const externalId = buildFmfTravelExternalId(fmfD, m);
          const idCandidates = fmfExternalIdCandidates(presetKey, fmfD, m).travel;
          const operationalCategory = toOperationalCategory(snap.fixtureCategory);
          const isHomeMatch = isHome;
          const opponentName = (isHomeMatch ? m.awayName : m.homeName).trim() || null;
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
            fmfD,
            phaseLabel: m.phaseLabel,
            fmfJogoNumber: m.fmfJogoNumber,
            homeName: m.homeName,
            awayName: m.awayName,
            venueText: m.venueText,
            competitionName: snap.name,
            isHomeMatch,
          } satisfies Record<string, unknown>;

          const existing = await this.prisma.travelLogistics.findFirst({
            where: { tenantId: tenant.id, externalId: { in: idCandidates } },
            orderBy: { updatedAt: 'desc' },
          });

          if (existing) {
            if (existing.status === 'cancelado') continue;
            await this.prisma.travelLogistics.update({
              where: { id: existing.id },
              data: {
                externalId,
                category: operationalCategory,
                matchDate,
                isHomeMatch,
                opponentName,
                stadiumName,
                championshipName,
                country: existing.country?.trim() || 'Brasil',
                beatscodeMeta: mergeTravelBeatscodeMeta(
                  existing.beatscodeMeta,
                  meta,
                ) as Prisma.InputJsonValue,
              },
            });
            updated++;
          } else {
            await this.prisma.travelLogistics.create({
              data: {
                tenantId: tenant.id,
                externalId,
                category: operationalCategory,
                matchDate,
                isHomeMatch,
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

}
