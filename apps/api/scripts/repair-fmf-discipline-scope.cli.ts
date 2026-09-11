import type { PrismaService } from '../src/prisma/prisma.service';
import type { ParsedFmfMatchReport } from '../src/fmf-scraper/fmf-match-report.parser';
import {
  applyValidatedRepairPlan,
  planFmfDisciplineScopeRepair,
  PRODUCTION_DISCIPLINE_REPAIR_ALLOWLIST,
} from '../src/fmf-scraper/fmf-discipline-scope-repair.util';

export type RepairCliArgs = {
  tenantId?: string;
  matchIds: string[];
  competition?: string;
  apply: boolean;
  planFingerprint?: string;
};

export function parseRepairCliArgs(argv: string[]): RepairCliArgs {
  const tenantId = argv.find((a) => a.startsWith('--tenantId='))?.split('=')[1]?.trim();
  const matchIdsRaw = argv.find((a) => a.startsWith('--matchIds='))?.split('=')[1]?.trim();
  const competition = argv.find((a) => a.startsWith('--competition='))?.split('=')[1]?.trim();
  const planFingerprint = argv.find((a) => a.startsWith('--planFingerprint='))?.split('=')[1]?.trim();
  const apply = argv.includes('--apply');
  const matchIds = matchIdsRaw ? matchIdsRaw.split(',').map((id) => id.trim()).filter(Boolean) : [];
  return { tenantId, matchIds, competition, apply, planFingerprint };
}

export async function runRepairDisciplineCli(
  prisma: PrismaService,
  args: RepairCliArgs,
  downloadAndParse: (url: string) => Promise<ParsedFmfMatchReport>,
): Promise<{ exitCode: number; payload: unknown }> {
  if (!args.tenantId || args.matchIds.length === 0) {
    return {
      exitCode: 1,
      payload: {
        error:
          'Uso: repair-fmf-discipline-scope.ts --tenantId=XXX --matchIds=id1,id2 [--competition=Sub-14] [--apply --planFingerprint=HASH]',
      },
    };
  }

  if (args.apply && !args.planFingerprint?.trim()) {
    return {
      exitCode: 1,
      payload: {
        error: 'ABORT: --apply exige --planFingerprint=<hash revisado do dry-run>',
      },
    };
  }

  try {
    const plan = await planFmfDisciplineScopeRepair(prisma, {
      tenantId: args.tenantId,
      matchIds: args.matchIds,
      competitionContains: args.competition,
      downloadAndParse,
    });

    if (!args.apply) {
      return {
        exitCode: 0,
        payload: {
          ...plan,
          dryRun: true,
          productionAllowlist: PRODUCTION_DISCIPLINE_REPAIR_ALLOWLIST,
          hint: 'Use --apply --planFingerprint=<hash do dry-run> para mutar',
        },
      };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: args.tenantId },
      select: { id: true, name: true, tradeName: true, slug: true },
    });
    if (!tenant) {
      return { exitCode: 1, payload: { error: 'Tenant não encontrado' } };
    }

    const reviewedPlanFingerprint = args.planFingerprint?.trim() ?? '';
    const applyResults = await applyValidatedRepairPlan(prisma, {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        tradeName: tenant.tradeName,
        slug: tenant.slug,
        aliases: [tenant.slug, 'boston city', 'boston'].filter(Boolean) as string[],
      },
      reviewedPlanFingerprint,
      tenantId: args.tenantId,
      matchIds: args.matchIds,
      competitionContains: args.competition,
      downloadAndParse,
    });

    return {
      exitCode: 0,
      payload: {
        planFingerprint: reviewedPlanFingerprint,
        applyResults,
      },
    };
  } catch (err) {
    return {
      exitCode: 1,
      payload: { error: (err as Error).message },
    };
  }
}
