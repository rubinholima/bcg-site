import { ForbiddenException } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';

describe('IntegrationsController — Omie status tenant scope', () => {
  it('nega tenant fora do escopo do usuário', async () => {
    const tenantAccess = {
      getAllowedTenantIds: jest.fn().mockResolvedValue(['t-allowed']),
      assertCanAccessTenant: jest.fn(() => {
        throw new ForbiddenException('forbidden');
      }),
    };
    const controller = new IntegrationsController(
      {} as never,
      { getStatusForTenant: jest.fn() } as never,
      tenantAccess as never,
    );

    await expect(
      controller.getOmieStatus(
        { user: { sub: 'u1', role: 'editor' } } as never,
        't-other',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
