import { computeItemsSubtotal, computeQuoteGrandTotal } from './procurement-quote-totals.util';

describe('procurement-quote-totals.util', () => {
  it('calcula subtotal dos itens', () => {
    expect(
      computeItemsSubtotal([
        { quantity: 2, unitPrice: 10 },
        { quantity: 1, unitPrice: 5 },
      ]),
    ).toBe(25);
  });

  it('calcula total com impostos frete desconto', () => {
    expect(
      computeQuoteGrandTotal(100, { tax: 10, shipping: 5, discount: 15, otherCosts: 2 }),
    ).toBe(102);
  });

  it('não retorna total negativo', () => {
    expect(computeQuoteGrandTotal(10, { discount: 100 })).toBe(0);
  });
});
