import { PerformanceAnalysisService } from './performance-analysis.service';

describe('PerformanceAnalysisService', () => {
  const prisma = {
    analysisTagDefinition: { count: jest.fn(), createMany: jest.fn(), findMany: jest.fn() },
    analysisSession: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    analysisVideoSource: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    analysisEvent: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    analysisClip: { findMany: jest.fn(), create: jest.fn() },
    analysisClipEvent: { createMany: jest.fn() },
    analysisClipPlayer: { createMany: jest.fn() },
  };
  const s3 = { uploadAnalysisVideo: jest.fn(), getObject: jest.fn() };
  const access = {
    assertTenant: jest.fn(),
    loadSession: jest.fn(),
    validateSessionKind: jest.fn().mockReturnValue('MATCH'),
    validateSessionSources: jest.fn(),
    assertPlayerInTenant: jest.fn(),
    assertTagInTenant: jest.fn().mockResolvedValue({
      id: 'tag1',
      key: 'passe',
      label: 'Passe',
      requiresPlayer: false,
      autoClipEnabled: false,
      autoClipPreMs: 8000,
      autoClipPostMs: 4000,
    }),
    assertVideoSourceInSession: jest.fn(),
  };

  const svc = new PerformanceAnalysisService(prisma as never, s3 as never, access as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createEvent é idempotente por clientEventKey', async () => {
    access.loadSession.mockResolvedValue({ id: 's1', tenantId: 't1' });
    const existing = { id: 'ev-existing', startMs: 1000 };
    prisma.analysisEvent.findFirst.mockResolvedValue(existing);

    const result = await svc.createEvent(
      's1',
      {
        tagDefinitionId: 'tag1',
        startMs: 1000,
        clientEventKey: 'live-abc',
      },
      ['t1'],
    );

    expect(result).toBe(existing);
    expect(prisma.analysisEvent.create).not.toHaveBeenCalled();
  });

  it('getSession não expõe storageKey nos vídeos', async () => {
    access.loadSession.mockResolvedValue({
      id: 's1',
      tenantId: 't1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.analysisVideoSource.findMany.mockResolvedValue([
      {
        id: 'v1',
        sourceType: 'UPLOAD',
        title: 'Transmissão',
        cameraLabel: null,
        externalUrl: null,
        durationMs: null,
        mimeType: 'video/mp4',
        width: null,
        height: null,
        processingStatus: 'ready',
        createdAt: new Date(),
        storageKey: 'private/analysis/t1/s1/file.mp4',
      },
    ]);
    prisma.analysisTagDefinition.count.mockResolvedValue(1);
    prisma.analysisTagDefinition.findMany.mockResolvedValue([]);

    const data = await svc.getSession('s1', ['t1']);
    expect(data.videoSources[0]).not.toHaveProperty('storageKey');
    expect(data.videoSources[0].streamUrl).toContain('/performance-analysis/video-sources/v1/stream');
  });
});
