import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard tokenVersion', () => {
  it('rejeita JWT com tokenVersion stale', async () => {
    const jwtService = {
      verify: jest.fn().mockReturnValue({
        sub: 'u1',
        email: 'a@b.com',
        username: 'editor1',
        role: 'editor',
        tokenVersion: 1,
      }),
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          blocked: false,
          role: 'editor',
          tokenVersion: 2,
        }),
      },
    };
    const guard = new JwtAuthGuard(jwtService as never, prisma as never);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer token' },
        }),
      }),
    };

    await expect(guard.canActivate(context as never)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('aceita JWT com tokenVersion atual', async () => {
    const jwtService = {
      verify: jest.fn().mockReturnValue({
        sub: 'u1',
        email: 'a@b.com',
        username: 'editor1',
        role: 'editor',
        tokenVersion: 4,
      }),
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          blocked: false,
          role: 'editor',
          tokenVersion: 4,
        }),
      },
    };
    const guard = new JwtAuthGuard(jwtService as never, prisma as never);
    const req = { headers: { authorization: 'Bearer token' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => req }),
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(req).toHaveProperty('user');
  });
});
