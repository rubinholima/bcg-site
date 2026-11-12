import { DepartmentsService } from './departments.service';
import { ForbiddenException } from '@nestjs/common';

describe('rh-tenant-isolation', () => {
  const prisma = {
    department: {
      findUnique: jest.fn().mockResolvedValue({ id: 'd1', tenantId: 'tenant-a', name: 'RH' }),
      findMany: jest.fn(),
    },
  };

  it('findOne nega tenant fora do escopo', async () => {
    const svc = new DepartmentsService(prisma as never);
    await expect(svc.findOne('d1', ['tenant-b'])).rejects.toThrow(ForbiddenException);
  });
});
