import { CredentialsAuthService } from './credentials-auth.service';

describe('CredentialsAuthService login session policy', () => {
  const jwtService = {
    sign: jest.fn((payload: { tokenVersion?: number }) => `token-v${payload.tokenVersion}`),
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('incrementa tokenVersion para usuário comum no login', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          email: 'a@b.com',
          username: 'editor1',
          name: 'Editor',
          role: 'editor',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuv', // bcrypt mock handled below
          blocked: false,
          mustChangePassword: false,
          tokenVersion: 2,
        }),
        update: jest.fn().mockResolvedValue({ tokenVersion: 3 }),
      },
    };
    const service = new CredentialsAuthService(prisma as never, jwtService as never);
    jest.spyOn(service, 'validateUser').mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      username: 'editor1',
      name: 'Editor',
      role: 'editor',
      mustChangePassword: false,
    });

    const result = await service.login('editor1', 'secret');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ tokenVersion: 3 }),
      expect.any(Object),
    );
    expect(result.access_token).toBe('token-v3');
  });

  it('não incrementa tokenVersion para super_admin', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'sa1',
          blocked: false,
          tokenVersion: 5,
          role: 'super_admin',
        }),
        update: jest.fn(),
      },
    };
    const service = new CredentialsAuthService(prisma as never, jwtService as never);
    jest.spyOn(service, 'validateUser').mockResolvedValue({
      id: 'sa1',
      email: 'sa@b.com',
      username: 'super',
      name: 'Super',
      role: 'super_admin',
      mustChangePassword: false,
    });

    await service.login('super', 'secret');

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ tokenVersion: 5 }),
      expect.any(Object),
    );
  });
});
