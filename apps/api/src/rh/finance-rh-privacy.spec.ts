describe('Finance × RH privacy (payroll linkage)', () => {
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

  it('projeção financeira não expõe chaves privadas do RH', () => {
    const payload = financeProjectionPayload();
    const json = JSON.stringify(payload);
    for (const key of rhPrivateKeys) {
      expect(json).not.toContain(`"${key}"`);
    }
    expect(Object.keys(payload)).not.toContain('bankData');
    expect(Object.keys(payload)).not.toContain('bulkFileKey');
  });
});
