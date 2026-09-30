import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TryoutWorkflowService } from './tryout-workflow.service';
import {
  isLegacyTryoutReviewRecord,
  isProspectInTryoutWorkflow,
} from './tryout-workflow.constants';
import { isProspectMinorFromBirthDate } from './tryout-age.util';
import { TryoutProspectDocumentsService } from './tryout-prospect-documents.service';

describe('Tryout workflow — regras de negócio', () => {
  it('legado flowPath=tryout sem stage/periodo não entra no workflow ativo', () => {
    expect(
      isLegacyTryoutReviewRecord({
        flowPath: 'tryout',
        tryoutWorkflowActivatedAt: null,
        tryoutWorkflowStage: null,
        tryoutPeriodStartedAt: null,
      }),
    ).toBe(true);
    expect(
      isProspectInTryoutWorkflow({
        flowPath: 'tryout',
        tryoutWorkflowStage: null,
        tryoutWorkflowActivatedAt: null,
      }),
    ).toBe(false);
  });

  it('menor exige autorização do responsável nos documentos', () => {
    const svc = new TryoutProspectDocumentsService({} as never, {} as never);
    const minor = svc.evaluateBlockingFromTypes(['identidade'], '2012-01-01');
    expect(minor.satisfied).toBe(false);
    expect(minor.missing).toContain('autorizacao_responsavel');
    const adult = svc.evaluateBlockingFromTypes(['identidade'], '1995-01-01');
    expect(adult.satisfied).toBe(true);
  });

  it('isProspectMinorFromBirthDate', () => {
    expect(isProspectMinorFromBirthDate('2015-06-01')).toBe(true);
    expect(isProspectMinorFromBirthDate('1990-06-01')).toBe(false);
  });
});

describe('TryoutWorkflowService — tenant isolation', () => {
  const tenantAccess = {
    assertCanAccessTenant: jest.fn((allowed: string[] | null, tenantId: string) => {
      if (allowed !== null && !allowed.includes(tenantId)) {
        throw new ForbiddenException('Acesso negado a esta empresa.');
      }
    }),
  };

  const prisma = {
    scoutingProspect: {
      findUnique: jest.fn(),
    },
  };

  const service = new TryoutWorkflowService(
    prisma as never,
    {} as never,
    {} as never,
    tenantAccess as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('nega prospect de outro tenant', async () => {
    prisma.scoutingProspect.findUnique.mockResolvedValue({
      id: 'p1',
      tenantId: 'tenant-b',
    });
    await expect(
      service.getDossier('p1', ['tenant-a']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('TryoutWorkflowService — renewPeriod desativado', () => {
  const service = new TryoutWorkflowService(
    {} as never,
    {} as never,
    {} as never,
    { assertCanAccessTenant: jest.fn() } as never,
    {} as never,
    {} as never,
  );

  it('renewPeriod lança BadRequestException', async () => {
    await expect(service.renewPeriod('x', {}, 'a')).rejects.toBeInstanceOf(BadRequestException);
  });
});
