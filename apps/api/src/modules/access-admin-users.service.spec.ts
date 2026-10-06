import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { AccessAdminUsersService } from './access-admin-users.service';
import { COMPANY_ADMIN_CREATED_USER_LEGACY_ROLE } from './user-identity-admin.constants';

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
  });

  it('company_admin não recebe super_admin na listagem', async () => {
    const { service, prisma } = makeService({
      users: makeUsers(2, 'editor'),
      allowedTenantIds: ['t1'],
    });
    await service.listManageableUsers('actor-sub', 'company_admin');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: { notIn: ['super_admin', 'company_admin'] },
        }),
      }),
    );
  });

  it('company_admin exclui usuário multi-empresa parcialmente fora do escopo', async () => {
    const multi = [
      {
        id: 'u-multi',
        email: 'multi@test.com',
        name: 'Multi',
        role: 'editor',
        platformFunctionId: null,
        blocked: false,
        platformFunction: null,
        userTenants: [
          { tenant: { id: 't1', name: 'T1' } },
          { tenant: { id: 't9', name: 'T9' } },
        ],
      },
      ...makeUsers(1),
    ];
    const { service, prisma } = makeService({
      users: multi,
      allowedTenantIds: ['t1'],
    });
    const rows = await service.listManageableUsers('actor-sub', 'company_admin');
    expect(rows.every((r) => r.id !== 'u-multi')).toBe(true);
    expect(prisma.userTenant.findMany).toHaveBeenCalled();
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

  it('assertActorCanManageUser bloqueia company_admin alvo para company_admin', async () => {
    const { service } = makeService({
      targetUser: {
        id: 'ca-1',
        role: 'company_admin',
        userTenants: [{ tenantId: 't1' }],
      },
    });
    await expect(
      service.assertActorCanManageUser('actor', 'company_admin', 'ca-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assertActorCanManageUser bloqueia overlap parcial multi-tenant', async () => {
    const { service } = makeService({
      targetUser: {
        id: 'u-1',
        role: 'editor',
        userTenants: [{ tenantId: 't1' }, { tenantId: 't2' }],
      },
      allowedTenantIds: ['t1'],
    });
    await expect(
      service.assertActorCanManageUser('actor', 'company_admin', 'u-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assertActorCanManageUser permite super_admin actor em qualquer usuário', async () => {
    const { service } = makeService();
    await expect(
      service.assertActorCanManageUser('actor', 'super_admin', 'any-id'),
    ).resolves.toBeUndefined();
  });

  it('mergeTenantIdsForCompanyAdminUpdate preserva tenants fora do escopo', () => {
    const { service } = makeService();
    const merged = service.mergeTenantIdsForCompanyAdminUpdate(
      ['t1', 't9'],
      ['t1', 't2'],
      ['t1', 't2'],
    );
    expect(merged.sort()).toEqual(['t1', 't2', 't9'].sort());
  });

  it('mergeTenantIdsForCompanyAdminUpdate rejeita tenant não autorizado', () => {
    const { service } = makeService();
    expect(() =>
      service.mergeTenantIdsForCompanyAdminUpdate(['t1'], ['t99'], ['t1']),
    ).toThrow(ForbiddenException);
  });

  it('company_admin create exige tenantIds', () => {
    const { service } = makeService();
    expect(() => service.assertCompanyAdminCreatePayload([], undefined)).toThrow(
      BadRequestException,
    );
  });

  it('company_admin create rejeita role elevada', () => {
    const { service } = makeService();
    expect(() => service.assertCompanyAdminCreatePayload(['t1'], 'company_admin')).toThrow(
      ForbiddenException,
    );
  });

  it('resolveCreateRoleForActor fixa user para company_admin', () => {
    const { service } = makeService();
    expect(service.resolveCreateRoleForActor('company_admin', 'editor')).toBe(
      COMPANY_ADMIN_CREATED_USER_LEGACY_ROLE,
    );
  });

  it('assertCanCreateOrManageIdentities nega editor', () => {
    const { service } = makeService();
    expect(() => service.assertCanCreateOrManageIdentities('editor')).toThrow(ForbiddenException);
  });
});
