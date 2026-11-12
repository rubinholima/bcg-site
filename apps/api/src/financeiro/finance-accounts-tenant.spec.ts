import { FinanceAccountsService } from './finance-accounts.service';

describe('FinanceAccountsService tenant isolation', () => {
  it('list usa filtro tenantId', async () => {
    const prisma = {
      financeAccount: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new FinanceAccountsService(prisma as never);
    await service.list('tenant-a', true);
    expect(prisma.financeAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-a', active: true } }),
    );
  });
});
