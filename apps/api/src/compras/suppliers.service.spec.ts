import { SuppliersService } from './suppliers.service';
import { ProcurementAuditService } from './procurement-audit.service';

describe('SuppliersService', () => {
  const prisma = {
    supplier: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tenant: { findUnique: jest.fn() },
    purchaseQuote: { findMany: jest.fn() },
    purchaseOrder: { findMany: jest.fn() },
    supplierDocument: { create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
  };
  const audit = {
    log: jest.fn(),
    listForEntity: jest.fn().mockResolvedValue([]),
  } as unknown as ProcurementAuditService;

  let service: SuppliersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SuppliersService(prisma as never, audit);
  });

  it('filtra por tenant quando informado', async () => {
    prisma.supplier.findMany.mockResolvedValue([]);
    await service.findAll('tenant-a', undefined, ['tenant-a'], { status: 'active' });
    expect(prisma.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-a', status: 'active' }),
      }),
    );
  });

  it('inativa em vez de apagar quando há referências', async () => {
    prisma.supplier.findUnique.mockResolvedValue({
      id: 's1',
      tenantId: 't1',
      _count: { quotes: 1, purchaseOrders: 0 },
    });
    prisma.supplier.update.mockResolvedValue({ id: 's1', status: 'inactive' });
    const res = await service.remove('s1');
    expect(prisma.supplier.delete).not.toHaveBeenCalled();
    expect(res).toEqual(expect.objectContaining({ soft: true }));
  });
});
