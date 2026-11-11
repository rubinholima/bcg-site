import { hasProcurementCapability } from './procurement-access.util';

describe('procurement-access.util', () => {
  it('adm_compras concede lançar proposta mas não aprovar', () => {
    expect(hasProcurementCapability(['adm_compras'], 'enter_quote')).toBe(true);
    expect(hasProcurementCapability(['adm_compras'], 'approve_quotation')).toBe(false);
  });

  it('gerir fornecedor não implica aprovar', () => {
    expect(hasProcurementCapability(['compras_fornecedores_gerir'], 'manage_supplier')).toBe(true);
    expect(hasProcurementCapability(['compras_fornecedores_gerir'], 'approve_quotation')).toBe(false);
    expect(hasProcurementCapability(['compras_fornecedores_gerir'], 'enter_quote')).toBe(false);
  });

  it('financeiro pode aprovar', () => {
    expect(hasProcurementCapability(['adm_financeiro'], 'approve_quotation')).toBe(true);
  });

  it('company_admin tem tudo', () => {
    expect(hasProcurementCapability([], 'approve_quotation', 'company_admin')).toBe(true);
  });
});
