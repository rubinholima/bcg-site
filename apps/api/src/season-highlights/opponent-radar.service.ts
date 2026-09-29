import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FMF_SYNC_TENANT_DEFAULTS } from '../fmf-scraper/fmf-sync-tenants.config';
import {
  buildDisplayName,
  buildFallbackIdentityKey,
  resolveOpponentIdentityFromFmf,
} from './fmf-opponent-roster-resolve.util';
import { normalizeIdentityKey, resolveSeasonFromMatchDate } from './season-standout.util';

function scoreLabel(home: number | null, away: number | null): string | null {
  if (home == null || away == null) return null;
  return `${home} x ${away}`;
}

@Injectable()
export class OpponentRadarService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureBackfill(tenantId: string): Promise<void> {
    const missing = await this.prisma.coachMatchReportOpponentPlayer.findMany({
      where: {
        highlightEvent: null,
        report: { tenantId, status: 'finalizado' },
      },
      select: { reportId: true },
      distinct: ['reportId'],
      take: 200,
    });
    for (const row of missing) {
      await this.syncReport(row.reportId);
    }
  }

  async syncReport(reportId: string): Promise<void> {
    const report = await this.prisma.coachMatchReport.findUnique({
      where: { id: reportId },
      include: {
        opponentHighlights: { orderBy: { sortOrder: 'asc' } },
        fmfMatchReport: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!report || report.status !== 'finalizado') return;
    if (report.opponentHighlights.length === 0) return;

    const aliases =
      FMF_SYNC_TENANT_DEFAULTS[report.tenant.slug as keyof typeof FMF_SYNC_TENANT_DEFAULTS]
        ?.aliases ?? [];

    for (const highlight of report.opponentHighlights) {
      await this.syncHighlight(report, highlight, aliases);
    }

    await this.recomputeProfileCounts(report.tenantId);
  }

  private async syncHighlight(
    report: {
      id: string;
      tenantId: string;
      category: string | null;
      matchDate: Date | null;
      opponentName: string | null;
      fmfMatchReportId: string | null;
      fmfMatchReport: {
        id: string;
        season: number;
        competition: string;
        homeTeam: string;
        awayTeam: string;
        homeScore: number | null;
        awayScore: number | null;
        matchDate: Date;
        category: string;
        rawParsed: unknown;
      } | null;
      tenant: { name: string };
    },
    highlight: {
      id: string;
      jerseyNumber: number | null;
      position: string | null;
      notes: string | null;
    },
    aliases: string[],
  ) {
    const existing = await this.prisma.opponentHighlightEvent.findUnique({
      where: { opponentHighlightId: highlight.id },
    });
    if (existing) return;

    const fmf = report.fmfMatchReport;
    const identity = fmf
      ? resolveOpponentIdentityFromFmf({
          rawParsed: fmf.rawParsed,
          homeTeam: fmf.homeTeam,
          awayTeam: fmf.awayTeam,
          clubName: report.tenant.name,
          clubAliases: aliases,
          opponentNameFallback: report.opponentName,
          jerseyNumber: highlight.jerseyNumber,
        })
      : resolveOpponentIdentityFromFmf({
          rawParsed: null,
          homeTeam: '',
          awayTeam: report.opponentName ?? 'Adversário',
          clubName: report.tenant.name,
          clubAliases: aliases,
          opponentNameFallback: report.opponentName,
          jerseyNumber: highlight.jerseyNumber,
        });

    const resolvedName = identity.sourceName;
    const displayName = buildDisplayName(resolvedName, highlight.jerseyNumber);
    const matchDate = report.matchDate ?? fmf?.matchDate ?? null;
    const season = resolveSeasonFromMatchDate(matchDate, fmf?.season);
    const opponentClub = identity.opponentClub || report.opponentName || 'Adversário';
    const fallbackKey = buildFallbackIdentityKey({
      tenantId: report.tenantId,
      opponentClub,
      resolvedName,
      staffNotes: highlight.notes,
      opponentHighlightId: highlight.id,
    });

    const profile = await this.findOrCreateProfile({
      tenantId: report.tenantId,
      cbfRegistration: identity.cbfRegistration,
      fallbackIdentityKey: identity.cbfRegistration ? null : fallbackKey,
      displayName,
      normalizedNameKey: normalizeIdentityKey(resolvedName || displayName),
      position: highlight.position,
      lastKnownClub: opponentClub,
      category: report.category ?? fmf?.category ?? null,
      identitySource: identity.identitySource,
      identityConfidence: identity.identityConfidence,
      seenAt: matchDate ?? new Date(),
    });

    const homeScore = fmf?.homeScore ?? null;
    const awayScore = fmf?.awayScore ?? null;

    await this.prisma.opponentHighlightEvent.create({
      data: {
        tenantId: report.tenantId,
        profileId: profile.id,
        reportId: report.id,
        opponentHighlightId: highlight.id,
        fmfMatchReportId: fmf?.id ?? report.fmfMatchReportId,
        season,
        matchDate,
        opponentClub,
        competition: fmf?.competition ?? null,
        category: report.category ?? fmf?.category ?? null,
        jerseyNumber: highlight.jerseyNumber,
        position: highlight.position,
        staffNotes: highlight.notes,
        homeScore,
        awayScore,
        scoreLabel: scoreLabel(homeScore, awayScore),
        clubWasHome: identity.clubWasHome,
        resolvedName,
        cbfRegistration: identity.cbfRegistration,
        identitySource: identity.identitySource,
        officialStats: identity.rosterStat
          ? (identity.rosterStat as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });

    await this.prisma.opponentHighlightProfile.update({
      where: { id: profile.id },
      data: {
        lastKnownClub: opponentClub,
        position: highlight.position ?? profile.position,
        category: report.category ?? profile.category,
        displayName: profile.displayName === displayName || !resolvedName ? profile.displayName : displayName,
        cbfRegistration: identity.cbfRegistration ?? profile.cbfRegistration,
        identitySource:
          identity.cbfRegistration != null ? 'cbf' : profile.identitySource,
        identityConfidence:
          identity.cbfRegistration != null ? 'high' : profile.identityConfidence,
        lastSeenAt: matchDate ?? profile.lastSeenAt,
      },
    });
  }

  private async findOrCreateProfile(input: {
    tenantId: string;
    cbfRegistration: string | null;
    fallbackIdentityKey: string | null;
    displayName: string;
    normalizedNameKey: string;
    position: string | null;
    lastKnownClub: string | null;
    category: string | null;
    identitySource: string;
    identityConfidence: string;
    seenAt: Date;
  }) {
    if (input.cbfRegistration) {
      const byCbf = await this.prisma.opponentHighlightProfile.findFirst({
        where: { tenantId: input.tenantId, cbfRegistration: input.cbfRegistration },
      });
      if (byCbf) return byCbf;
    }
    if (input.fallbackIdentityKey) {
      const byFallback = await this.prisma.opponentHighlightProfile.findFirst({
        where: { tenantId: input.tenantId, fallbackIdentityKey: input.fallbackIdentityKey },
      });
      if (byFallback) return byFallback;
    }
    if (input.normalizedNameKey && input.lastKnownClub) {
      const clubKey = normalizeIdentityKey(input.lastKnownClub);
      const candidates = await this.prisma.opponentHighlightProfile.findMany({
        where: {
          tenantId: input.tenantId,
          normalizedNameKey: input.normalizedNameKey,
          cbfRegistration: null,
        },
        take: 5,
      });
      const hit = candidates.find(
        (c) => normalizeIdentityKey(c.lastKnownClub ?? '') === clubKey,
      );
      if (hit) return hit;
    }

    return this.prisma.opponentHighlightProfile.create({
      data: {
        tenantId: input.tenantId,
        cbfRegistration: input.cbfRegistration,
        fallbackIdentityKey: input.fallbackIdentityKey,
        displayName: input.displayName,
        normalizedNameKey: input.normalizedNameKey,
        position: input.position,
        lastKnownClub: input.lastKnownClub,
        category: input.category,
        identitySource: input.identitySource,
        identityConfidence: input.identityConfidence,
        firstSeenAt: input.seenAt,
        lastSeenAt: input.seenAt,
        highlightCount: 0,
      },
    });
  }

  private async recomputeProfileCounts(tenantId: string) {
    const profiles = await this.prisma.opponentHighlightProfile.findMany({
      where: { tenantId },
      select: { id: true },
    });
    for (const p of profiles) {
      const count = await this.prisma.opponentHighlightEvent.count({
        where: { profileId: p.id },
      });
      await this.prisma.opponentHighlightProfile.update({
        where: { id: p.id },
        data: { highlightCount: count },
      });
    }
  }
}
