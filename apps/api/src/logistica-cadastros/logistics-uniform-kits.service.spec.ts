import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { LogisticsUniformKitsService } from './logistics-uniform-kits.service';

describe('LogisticsUniformKitsService', () => {
  const tenantAccess = {
    getAllowedTenantIds: jest.fn(),
    assertCanAccessTenant: jest.fn(),
  };
  const prisma = {
    logisticsUniformKit: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    logisticsUniformKitItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    logisticsUniformType: { findUnique: jest.fn() },
    logisticsClothingItem: { count: jest.fn() },
    tenant: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) =>
      fn({
        logisticsUniformKitItem: prisma.logisticsUniformKitItem,
        logisticsUniformKit: prisma.logisticsUniformKit,
      }),
    ),
  };

  let service: LogisticsUniformKitsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new LogisticsUniformKitsService(prisma as never, tenantAccess as never);
  });

  it('company admin cria kit no tenant permitido', async () => {
    tenantAccess.getAllowedTenantIds.mockResolvedValue(['tenant-a']);
    prisma.logisticsClothingItem.count.mockResolvedValue(0);
    prisma.logisticsUniformKit.create.mockResolvedValue({ id: 'k1', name: 'KIT A' });

    await service.createUniformKit(
      { sub: 'u1', role: 'company_admin' },
      { tenantId: 'tenant-a', name: 'Kit A' },
    );

    expect(prisma.logisticsUniformKit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'tenant-a', name: 'KIT A' }),
      }),
    );
  });

  it('company admin com tenantId fora do escopo recebe 403 no create', async () => {
    tenantAccess.getAllowedTenantIds.mockResolvedValue(['tenant-a']);
    tenantAccess.assertCanAccessTenant.mockImplementation(() => {
      throw new ForbiddenException();
    });

    await expect(
      service.createUniformKit(
        { sub: 'u1', role: 'company_admin' },
        { tenantId: 'tenant-b', name: 'Kit B' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloqueia mutação de kit global para não super admin', async () => {
    tenantAccess.getAllowedTenantIds.mockResolvedValue(['tenant-a']);
    prisma.logisticsUniformKit.findUnique.mockResolvedValue({
      id: 'sys',
      tenantId: null,
      isSystem: true,
      name: 'LEGADO',
      items: [],
    });

    await expect(
      service.updateUniformKit(
        { sub: 'u1', role: 'company_admin' },
        'sys',
        { name: 'X' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('exige tenantId para company admin no create', async () => {
    tenantAccess.getAllowedTenantIds.mockResolvedValue(['tenant-a']);

    await expect(
      service.createUniformKit({ sub: 'u1', role: 'company_admin' }, { name: 'Sem tenant' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lista inclui kits globais e do tenant quando tenantId informado', async () => {
    tenantAccess.getAllowedTenantIds.mockResolvedValue(['tenant-a']);
    prisma.logisticsUniformKit.findMany.mockResolvedValue([]);

    await service.findUniformKits(
      { sub: 'u1', role: 'company_admin' },
      'true',
      undefined,
      undefined,
      'tenant-a',
    );

    expect(prisma.logisticsUniformKit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: [{ tenantId: null }, { tenantId: 'tenant-a' }],
            }),
          ]),
        }),
      }),
    );
  });
});
