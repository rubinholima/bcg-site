import { FinanceCategoriesService } from './finance-categories.service';

describe('FinanceCategoriesService hierarchy', () => {
  it('create com parentId exige pai no mesmo tenant', async () => {
    const prisma = {
      financeCategory: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const service = new FinanceCategoriesService(prisma as never);
    await expect(
      service.create('t1', { name: 'Sub', parentId: 'parent-x' }),
    ).rejects.toThrow('Categoria pai inválida');
  });
});
