import { ForbiddenException } from '@nestjs/common';
import { AccessAdminUsersService } from './access-admin-users.service';

describe('AccessAdminUsersService', () => {
  function makeUsers(count: number, role: string | null = 'editor') {
    return Array.from({ length: count }, (_, i) => ({
      id: `u-${i}`,
      email: `user${i}@test.com`,
      name: `User ${i}`,
      role,
      platformFunctionId: null,
      blocked: false,
      platformFunction: null,
      userTenants: [{ tenant: { id: 't1', name: 'Tenant 1' } }],
    }));
  }

  function makeService(overrides?: {
    users?: ReturnType<typeof makeUsers>;
    allowedTenantIds?: string[] | null;
    targetUser?: {
      id: string;
      role: string | null;
      userTenants: { tenantId: string }[];
    } | null;
  }) {
    const users = overrides?.users ?? makeUsers(3);
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue(users),
        findUnique: jest.fn().mockResolvedValue(overrides?.targetUser ?? null),
      },
      userTenant: {
        findMany: jest.fn().mockResolvedValue(users.map((u) => ({ userId: u.id }))),
      },
    };
    const tenantAccess = {
      getAllowedTenantIds: jest
        .fn()
        .mockResolvedValue(overrides?.allowedTenantIds ?? ['t1']),
    };
    const service = new AccessAdminUsersService(prisma as never, tenantAccess as never);
    return { service, prisma, tenantAccess };
  }

  it('super_admin lista todos os usuários gerenciáveis (79 no fixture)', async () => {
    const fixtureUsers = makeUsers(79);
    const { service, prisma } = makeService({ users: fixtureUsers });
    const rows = await service.listManageableUsers('actor-sub', 'super_admin');
    expect(prisma.user.findMany).toHaveBeenCalled();
    expect(rows).toHaveLength(79);
    expect(rows[0]).toMatchObject({
      id: expect.any(String),
      email: expect.any(String),
      name: expect.any(String),
      tenantNames: expect.any(Array),
    });
  });

  it('company_admin não recebe super_admin na listagem', async () => {
    const mixed = [
      ...makeUsers(2, 'editor'),
      ...makeUsers(1, 'super_admin').map((u, i) => ({ ...u, id: `sa-${i}`, email: 'sa@test.com' })),
    ];
    const { service, prisma } = makeService({
      users: mixed.filter((u) => u.role !== 'super_admin'),
      allowedTenantIds: ['t1'],
    });
    await service.listManageableUsers('actor-sub', 'company_admin');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: { not: 'super_admin' } }),
      }),
    );
  });

  it('company_admin com tenants restritos lista só usuários vinculados', async () => {
    const { service, prisma, tenantAccess } = makeService({
      users: makeUsers(4),
      allowedTenantIds: ['t1', 't2'],
    });
    await service.listManageableUsers('actor-sub', 'company_admin');
    expect(tenantAccess.getAllowedTenantIds).toHaveBeenCalled();
    expect(prisma.userTenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: { in: ['t1', 't2'] } },
      }),
    );
  });

  it('assertActorCanManageUser bloqueia super_admin alvo para company_admin', async () => {
    const { service } = makeService({
      targetUser: {
        id: 'sa-1',
        role: 'super_admin',
        userTenants: [{ tenantId: 't1' }],
      },
    });
    await expect(
      service.assertActorCanManageUser('actor', 'company_admin', 'sa-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assertActorCanManageUser permite super_admin actor em qualquer usuário', async () => {
    const { service } = makeService();
    await expect(
      service.assertActorCanManageUser('actor', 'super_admin', 'any-id'),
    ).resolves.toBeUndefined();
  });
});
