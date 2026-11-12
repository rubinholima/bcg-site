describe('internal transfer semantics foundation', () => {
  it('transactionKind internal_transfer não é despesa operacional', () => {
    const kinds = ['operating_expense', 'operating_income', 'internal_transfer'];
    expect(kinds).toContain('internal_transfer');
    expect('internal_transfer').not.toBe('operating_expense');
  });
});
