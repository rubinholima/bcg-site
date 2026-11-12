import { ForbiddenException } from '@nestjs/common';
import { PayrollClosingService } from './payroll-closing.service';

describe('payroll tenant isolation', () => {
  it('nega leitura cross-tenant', async () => {
    const prisma = {
      rhPayrollClosing: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          tenantId: 'tenant-b',
          referenceMonth: new Date(),
          status: 'em_preparacao',
          employeeSnapshots: [],
          adjustments: [],
          accountingPackage: null,
          accountingHistory: [],
          statusHistory: [],
        }),
      },
    };
    const service = new PayrollClosingService(prisma as never, {} as never, {} as never);
    await expect(service.findOne('p1', ['tenant-a'])).rejects.toThrow(ForbiddenException);
  });
});
