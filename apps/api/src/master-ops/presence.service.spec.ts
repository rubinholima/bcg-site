import { PresenceService } from './presence.service';

describe('PresenceService heartbeat', () => {
  it('remove outras sessões de presença para usuário comum', async () => {
    const prisma = {
      userPresenceSession: {
        findUnique: jest.fn().mockResolvedValue(null),
        delete: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
      },
    };
    const service = new PresenceService(prisma as never);

    await service.heartbeat(
      'user-1',
      'editor',
      {
        sessionKey: 'sess-b',
        currentPath: '/dashboard/futebol',
        isActive: true,
      },
      'jest',
    );

    expect(prisma.userPresenceSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', sessionKey: { not: 'sess-b' } },
    });
  });

  it('preserva múltiplas sessões de presença para super_admin', async () => {
    const prisma = {
      userPresenceSession: {
        findUnique: jest.fn().mockResolvedValue(null),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
      },
    };
    const service = new PresenceService(prisma as never);

    await service.heartbeat(
      'sa-1',
      'super_admin',
      {
        sessionKey: 'sess-a',
        currentPath: '/dashboard',
        isActive: true,
      },
      'jest',
    );

    expect(prisma.userPresenceSession.deleteMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'sa-1' }),
      }),
    );
  });
});
