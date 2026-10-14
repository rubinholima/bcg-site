import { ForbiddenException } from '@nestjs/common';
import { EventsService } from './events.service';

describe('EventsService tenant isolation', () => {
  const prisma = {
    event: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const tenantAccess = {
    getAllowedTenantIds: jest.fn(),
    assertCanAccessTenant: jest.fn(),
  };
  const homeContentService = { enrichBlocksWithGlobalPresence: jest.fn() };
  const s3 = { uploadMedia: jest.fn(), getPublicUrl: jest.fn() };

  const svc = new EventsService(
    prisma as never,
    homeContentService as never,
    s3 as never,
    tenantAccess as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findAll restringe por tenants permitidos', async () => {
    tenantAccess.getAllowedTenantIds.mockResolvedValue(['t1']);
    prisma.event.findMany.mockResolvedValue([]);
    await svc.findAll({}, { jwtSub: 'u1', role: 'company_admin' });
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: { in: ['t1'] } }),
      }),
    );
  });

  it('findAll com escopo vazio não retorna eventos', async () => {
    tenantAccess.getAllowedTenantIds.mockResolvedValue([]);
    prisma.event.findMany.mockResolvedValue([]);
    await svc.findAll({}, { jwtSub: 'u1', role: 'editor' });
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: [] } }),
      }),
    );
  });

  it('findOne nega evento de outro tenant', async () => {
    tenantAccess.getAllowedTenantIds.mockResolvedValue(['t1']);
    tenantAccess.assertCanAccessTenant.mockImplementation(() => {
      throw new ForbiddenException();
    });
    prisma.event.findUnique.mockResolvedValue({
      id: 'e1',
      slug: 'x',
      name: 'X',
      description: null,
      organizer: 'tenant',
      tenantId: 't2',
      category: 'other',
      fixtureCategory: null,
      startDate: null,
      endDate: null,
      logoUrl: null,
      content: { blocks: [{ id: 'a', type: 'text', sortOrder: 0 }] },
      competitionFormat: null,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      tenant: { name: 'T2', slug: 't2', logoUrl: null },
    });
    await expect(svc.findOne('e1', { jwtSub: 'u1', role: 'company_admin' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('create nega tenant fora do escopo', async () => {
    tenantAccess.getAllowedTenantIds.mockResolvedValue(['t1']);
    tenantAccess.assertCanAccessTenant.mockImplementation((_allowed: string[] | null, tid: string) => {
      if (tid !== 't1') throw new ForbiddenException();
    });
    prisma.event.findUnique.mockResolvedValue(null);
    await expect(
      svc.create(
        {
          name: 'E',
          slug: 'e',
          organizer: 'tenant',
          tenantId: 't2',
        },
        { jwtSub: 'u1', role: 'company_admin' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
