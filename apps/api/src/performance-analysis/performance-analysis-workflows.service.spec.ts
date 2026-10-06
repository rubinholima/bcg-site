import { ForbiddenException } from '@nestjs/common';
import { PerformanceAnalysisWorkflowsService } from './performance-analysis-workflows.service';
import { PerformanceAnalysisAccessService } from './performance-analysis-access.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PerformanceAnalysisWorkflowsService', () => {
  const access = {
    assertTenant: jest.fn(),
    loadOpponentProfile: jest.fn(),
    loadPreMatchVersion: jest.fn(),
    assertClipInTenant: jest.fn(),
    loadSession: jest.fn(),
  } as unknown as PerformanceAnalysisAccessService;

  const prisma = {
    coachTrainingSession: { findUnique: jest.fn(), findMany: jest.fn() },
    analysisSession: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    analysisPreMatchVersion: { findUnique: jest.fn(), update: jest.fn() },
    analysisOpponentProfile: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    analysisOpponentObservedMatch: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    analysisOpponentPlayer: { findUnique: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    analysisOpponentSetPiece: { findUnique: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    analysisClipCollection: { findUnique: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    analysisClipCollectionItem: { findFirst: jest.fn(), update: jest.fn() },
    travelLogistics: { findUnique: jest.fn() },
    analysisPreMatchPreparation: { create: jest.fn(), findUnique: jest.fn() },
    analysisOpponentLineup: { findMany: jest.fn() },
    analysisVideoSource: { findMany: jest.fn() },
    analysisClip: { findMany: jest.fn(), findUnique: jest.fn() },
    analysisEvent: { findMany: jest.fn() },
  } as unknown as PrismaService;

  let service: PerformanceAnalysisWorkflowsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PerformanceAnalysisWorkflowsService(prisma, access);
  });

  it('openTrainingAnalysis reutiliza sessão existente', async () => {
    (prisma.coachTrainingSession.findUnique as jest.Mock).mockResolvedValue({
      id: 't1',
      tenantId: 'ten1',
      sessionDate: '2026-10-01',
      category: 'sub17',
      staff: null,
    });
    (access.assertTenant as jest.Mock).mockImplementation(() => undefined);
    (prisma.analysisSession.findFirst as jest.Mock).mockResolvedValue({ id: 's-existing' });

    const result = await service.openTrainingAnalysis('t1', ['ten1']);
    expect(result.created).toBe(false);
    expect(result.session.id).toBe('s-existing');
    expect(prisma.analysisSession.create).not.toHaveBeenCalled();
  });

  it('bloqueia edição de versão APPROVED', async () => {
    (access.loadPreMatchVersion as jest.Mock).mockResolvedValue({
      id: 'v1',
      lifecycle: 'APPROVED',
      preparation: { tenantId: 'ten1' },
    });

    await expect(
      service.updatePreMatchVersion('v1', { staffNotes: 'x' }, ['ten1']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('transição inválida de lifecycle', () => {
    expect(() => service.assertLifecycleTransition('DRAFT', 'PRESENTED')).toThrow();
    expect(() => service.assertLifecycleTransition('DRAFT', 'REVIEW')).not.toThrow();
  });

  it('remove jogo observado com tenant válido', async () => {
    (prisma.analysisOpponentObservedMatch.findUnique as jest.Mock).mockResolvedValue({
      id: 'om1',
      tenantId: 'ten1',
    });
    (access.assertTenant as jest.Mock).mockImplementation(() => undefined);

    const result = await service.deleteObservedMatch('om1', ['ten1']);
    expect(result.ok).toBe(true);
    expect(prisma.analysisOpponentObservedMatch.delete).toHaveBeenCalledWith({ where: { id: 'om1' } });
  });

  it('bloqueia importação de material em versão APPROVED', async () => {
    (access.loadPreMatchVersion as jest.Mock).mockResolvedValue({
      id: 'v1',
      lifecycle: 'APPROVED',
      preparation: { tenantId: 'ten1' },
    });

    await expect(
      service.importOpponentMaterialIntoVersion(
        'v1',
        { profileId: 'p1', includeTacticalSections: true },
        ['ten1'],
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reordena itens de coleção de clips', async () => {
    (prisma.analysisClipCollection.findUnique as jest.Mock).mockResolvedValue({
      id: 'c1',
      tenantId: 'ten1',
    });
    (access.assertTenant as jest.Mock).mockImplementation(() => undefined);
    (prisma.analysisClipCollectionItem.findFirst as jest.Mock).mockResolvedValue({ id: 'i1' });

    const result = await service.reorderClipCollectionItems(
      'c1',
      [{ id: 'i1', groupKey: 'PRESSAO', sortOrder: 2 }],
      ['ten1'],
    );
    expect(result.ok).toBe(true);
    expect(prisma.analysisClipCollectionItem.update).toHaveBeenCalled();
  });
});
