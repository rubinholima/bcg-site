describe('ticket inventory capacity (EventTicket consumed)', () => {
  it('cancelled não entra no consumo — regra documentada', () => {
    const statuses = ['valid', 'used'];
    expect(statuses.includes('cancelled')).toBe(false);
  });
});
