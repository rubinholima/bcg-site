import type { PrismaService } from '../prisma/prisma.service';
import type { FmfReportOccurrence } from '../fmf-scraper/fmf-match-report.parser';

export async function syncFmfMatchIncidents(
  prisma: PrismaService,
  params: {
    tenantId: string;
    matchId: string;
    occurrencesText: string | null;
    occurrences: FmfReportOccurrence[];
  },
): Promise<void> {
  await prisma.footballMatchIncident.deleteMany({
    where: { fmfMatchReportId: params.matchId, source: 'fmf' },
  });

  await prisma.fmfMatchReport.update({
    where: { id: params.matchId },
    data: { occurrencesText: params.occurrencesText },
  });

  if (params.occurrences.length === 0) return;

  await prisma.footballMatchIncident.createMany({
    data: params.occurrences.map((o) => ({
      tenantId: params.tenantId,
      fmfMatchReportId: params.matchId,
      source: 'fmf',
      kind: o.kind,
      description: o.description,
      minute: o.minute,
      period: o.period,
      externalKey: o.externalKey,
    })),
  });
}
