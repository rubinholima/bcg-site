import { FinanceiroLancamentosService } from '../financeiro/financeiro-lancamentos.service';
import { PayrollClosingService } from './payroll-closing.service';

const rhPrivateKeys = [
  'bankData',
  'bulkFileKey',
  'extractedFileKey',
  'fileKey',
  'pixKey',
  'ctpsUrl',
  'pisNumber',
];

function financeProjectionPayload() {
  return {
    id: 'lanc-1',
    tenantId: 't1',
    tipo: 'pagar',
    status: 'pendente',
    ownershipKind: 'projection',
    sourceModule: 'rh_payroll',
    sourceType: 'payroll_closing',
    sourceId: 'closing-1',
    valor: 1200,
    descricao: 'Folha 2026-11',
  };
}

describe('Finance × RH privacy (payroll linkage)', () => {
  it('projeção financeira não expõe chaves privadas do RH', () => {
    const payload = financeProjectionPayload();
    const json = JSON.stringify(payload);
    for (const key of rhPrivateKeys) {
      expect(json).not.toContain(`"${key}"`);
    }
    expect(Object.keys(payload)).not.toContain('bankData');
    expect(Object.keys(payload)).not.toContain('bulkFileKey');
  });

  it('FinanceiroLancamentosService.findOne não consulta entidades RH de contracheque/ponto', async () => {
    const lancRow = {
      id: 'lanc-1',
      tenantId: 't1',
      tipo: 'pagar',
      status: 'pendente',
      ownershipKind: 'projection',
      sourceModule: 'rh_payroll',
      sourceType: 'payroll_closing',
      sourceId: 'closing-1',
      valor: { toNumber: () => 500 },
      descricao: 'Folha',
      contraparte: null,
      supplierId: null,
      customerId: null,
      dueDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      currency: 'BRL',
      createdByUserId: null,
      paidAt: null,
      categoryId: null,
      notes: null,
    };

    const prisma = {
      financeiroLancamento: {
        findUnique: jest.fn().mockResolvedValue(lancRow),
      },
      rhPayslipIndividual: { findMany: jest.fn() },
      rhPayslipBatch: { findMany: jest.fn() },
      rhTimeClockBatch: { findMany: jest.fn() },
      rhTimeBankMovement: { findMany: jest.fn() },
    };

    const audit = { log: jest.fn() };
    const service = new FinanceiroLancamentosService(prisma as never, audit as never);
    const row = await service.findOne('lanc-1');
    const json = JSON.stringify(row);

    for (const key of rhPrivateKeys) {
      expect(json).not.toContain(`"${key}"`);
    }
    expect(prisma.rhPayslipIndividual.findMany).not.toHaveBeenCalled();
    expect(prisma.rhPayslipBatch.findMany).not.toHaveBeenCalled();
    expect(prisma.rhTimeClockBatch.findMany).not.toHaveBeenCalled();
    expect(prisma.rhTimeBankMovement.findMany).not.toHaveBeenCalled();
  });

  it('handoff folha → financeiro não inclui payload de snapshot nos args de projeção', async () => {
    const closing = {
      id: 'close-1',
      tenantId: 't1',
      referenceMonth: new Date('2026-11-01'),
      status: 'RH_APPROVED',
      adjustments: [],
      employeeSnapshots: [
        { employmentId: 'emp-1', snapshot: { salaryBase: 100, bankData: { pix: 'secret' } } },
      ],
      accountingPackage: null,
      accountingHistory: [],
      statusHistory: [],
      financeLancamentoId: null,
    };

    const financeiro = {
      createOrGetProjection: jest.fn().mockResolvedValue({
        lancamento: { id: 'l2', valor: 100 },
        created: true,
      }),
    };
    const prisma = { rhPayrollClosing: { update: jest.fn().mockResolvedValue({}) } };
    const service = new PayrollClosingService(prisma as never, financeiro as never, { log: jest.fn() } as never, {} as never);
    jest.spyOn(service, 'findOne').mockResolvedValue(closing as never);

    await service.handoffFinance(
      'close-1',
      ['t1'],
      { userId: 'u', name: 'T' },
      { paymentDueDate: '2026-12-05' },
    );
    const arg = financeiro.createOrGetProjection.mock.calls[0][0];
    expect(arg).not.toHaveProperty('employeeSnapshots');
    expect(JSON.stringify(arg)).not.toContain('bankData');
  });
});
