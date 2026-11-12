import {
  assertPurchaseRequisitionApprovalAccess,
  isPurchaseGerenteApproverRole,
} from './purchase-requisition-access.util';

describe('purchase-requisition-access.util', () => {
  it('supervisor não é aprovador gerente', () => {
    expect(isPurchaseGerenteApproverRole('supervisor')).toBe(false);
    expect(isPurchaseGerenteApproverRole('gerente')).toBe(true);
  });

  it('gerente com futebol_logistica pode aprovar etapa gerente', () => {
    expect(() =>
      assertPurchaseRequisitionApprovalAccess({
        approvalStep: 'gerente',
        platformRole: 'gerente',
        moduleSlugs: ['futebol_logistica'],
      }),
    ).not.toThrow();
  });

  it('gerente sem módulo de requisição é bloqueado', () => {
    expect(() =>
      assertPurchaseRequisitionApprovalAccess({
        approvalStep: 'gerente',
        platformRole: 'gerente',
        moduleSlugs: ['futebol_treinadores'],
      }),
    ).toThrow(/Sem acesso/);
  });

  it('financeiro exige approve_quotation', () => {
    expect(() =>
      assertPurchaseRequisitionApprovalAccess({
        approvalStep: 'financeiro',
        platformRole: 'administrativo',
        moduleSlugs: ['futebol_logistica'],
      }),
    ).toThrow();
    expect(() =>
      assertPurchaseRequisitionApprovalAccess({
        approvalStep: 'financeiro',
        platformRole: 'administrativo',
        moduleSlugs: ['adm_financeiro'],
      }),
    ).not.toThrow();
  });
});
