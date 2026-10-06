import { BadRequestException } from '@nestjs/common';
import { PerformanceAnalysisService } from './performance-analysis.service';

describe('PerformanceAnalysisService operational', () => {
  const prisma = {
    analysisSession: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    analysisEvent: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    analysisVideoSource: { findFirst: jest.fn() },
    analysisClip: { create: jest.fn(), findMany: jest.fn() },
    analysisClipEvent: { create: jest.fn() },
    analysisClipPlayer: { create: jest.fn() },
    analysisTagDefinition: { count: jest.fn(), findMany: jest.fn(), createMany: jest.fn() },
    player: { findMany: jest.fn(), findFirst: jest.fn() },
    analysisPlayerMaterialItem: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
  };
  const access = {
    assertTenant: jest.fn(),
    loadSession: jest.fn(),
    validateSessionKind: jest.fn(),
    validateSessionSources: jest.fn(),
    assertPlayerInTenant: jest.fn(),
    assertTagInTenant: jest.fn(),
    assertVideoSourceInSession: jest.fn(),
  };

  const svc = new PerformanceAnalysisService(prisma as never, {} as never, access as never);

  beforeEach(() => jest.clearAllMocks());

  it('rejeita fieldX fora do intervalo normalizado', async () => {
    access.loadSession.mockResolvedValue({ id: 's1', tenantId: 't1', status: 'live' });
    access.assertTagInTenant.mockResolvedValue({
      id: 'tag1',
      key: 'passe',
      label: 'Passe',
      requiresPlayer: false,
      autoClipEnabled: false,
      autoClipPreMs: 8000,
      autoClipPostMs: 4000,
    });
    await expect(
      svc.createEvent(
        's1',
        { tagDefinitionId: 'tag1', startMs: 0, fieldX: 1.5 },
        ['t1'],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige atleta quando tag requiresPlayer', async () => {
    access.loadSession.mockResolvedValue({ id: 's1', tenantId: 't1', status: 'live' });
    access.assertTagInTenant.mockResolvedValue({
      id: 'tag1',
      key: 'passe',
      label: 'Passe',
      requiresPlayer: true,
      autoClipEnabled: false,
      autoClipPreMs: 8000,
      autoClipPostMs: 4000,
    });
    await expect(
      svc.createEvent('s1', { tagDefinitionId: 'tag1', startMs: 0 }, ['t1']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
