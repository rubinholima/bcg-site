import { BadRequestException } from '@nestjs/common';
import { PerformanceAnalysisAccessService } from './performance-analysis-access.service';

describe('PerformanceAnalysisAccessService', () => {
  const prisma = {
    fmfMatchReport: { findFirst: jest.fn() },
    travelLogistics: { findFirst: jest.fn() },
    coachTrainingSession: { findFirst: jest.fn() },
    player: { findFirst: jest.fn() },
    analysisTagDefinition: { findFirst: jest.fn() },
    analysisVideoSource: { findFirst: jest.fn() },
    analysisSession: { findUnique: jest.fn() },
  };
  const tenantAccess = {
    assertCanAccessTenant: jest.fn(),
  };

  const svc = new PerformanceAnalysisAccessService(prisma as never, tenantAccess as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejeita múltiplas fontes canônicas na sessão', async () => {
    await expect(
      svc.validateSessionSources({
        tenantId: 't1',
        fmfMatchReportId: 'm1',
        trainingSessionId: 'tr1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('valida partida FMF no tenant', async () => {
    prisma.fmfMatchReport.findFirst.mockResolvedValue(null);
    await expect(
      svc.validateSessionSources({ tenantId: 't1', fmfMatchReportId: 'm1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.fmfMatchReport.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'm1', tenantId: 't1' } }),
    );
  });

  it('assertTenant delega ao TenantAccessService', () => {
    svc.assertTenant(['t1'], 't1');
    expect(tenantAccess.assertCanAccessTenant).toHaveBeenCalledWith(['t1'], 't1');
  });
});
