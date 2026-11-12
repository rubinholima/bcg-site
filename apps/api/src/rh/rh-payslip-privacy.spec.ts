import { ForbiddenException } from '@nestjs/common';
import { RhPayslipService } from './rh-payslip.service';

describe('RhPayslip privacy', () => {
  it('nega colaborador errado', async () => {
    const prisma = {
      rhPayslipIndividual: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ps1',
          tenantId: 't1',
          employeeId: 'emp-a',
          status: 'DISPONIBILIZADO',
          extractedFileKey: 'private/rh_payslip/x.pdf',
        }),
      },
    };
    const service = new RhPayslipService(prisma as never, {} as never, {} as never, {} as never);
    await expect(
      service.acknowledgePayslip('ps1', 'emp-b', ['t1'], { userId: 'u1', name: 'Test' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
