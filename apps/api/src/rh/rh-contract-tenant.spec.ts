import { ForbiddenException } from '@nestjs/common';
import { EmploymentContractsService } from './employment-contracts.service';

describe('RH contract tenant isolation', () => {
  const prisma = {
    employmentContract: {
      findUnique: jest.fn(),
    },
    employment: {
      findUnique: jest.fn(),
    },
  };

  it('nega acesso cross-tenant em findOneById', async () => {
    prisma.employmentContract.findUnique.mockResolvedValue({
      id: 'c1',
      tenantId: 'tenant-b',
      employmentId: 'emp1',
    });
    const service = new EmploymentContractsService(
      prisma as never,
      { getObjectBuffer: jest.fn() } as never,
      {} as never,
      {} as never,
      { notifyRhEvent: jest.fn() } as never,
    );
    await expect(
      service.findOneById('c1', ['tenant-a']),
    ).rejects.toThrow(ForbiddenException);
  });
});
