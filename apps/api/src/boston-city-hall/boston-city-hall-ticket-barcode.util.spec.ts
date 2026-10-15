import { renderTicketCode128Png } from './boston-city-hall-ticket-barcode.util';

describe('renderTicketCode128Png', () => {
  it('gera PNG para código BCH', async () => {
    const buf = await renderTicketCode128Png('BCH-26-TEST01');
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  });
});
