import { complimentaryIssuanceKey, orderItemIssuanceKey } from './boston-city-hall-event-ticket-issue.util';
import { lineIndexesToIssue } from './boston-city-hall-ticket-issuance';

describe('complimentary issuance keys', () => {
  it('quantity N gera N chaves distintas', () => {
    const id = 'adm-1';
    const keys = lineIndexesToIssue(4, 0).map((i) => complimentaryIssuanceKey(id, i));
    expect(new Set(keys).size).toBe(4);
  });

  it('retry não duplica índices já emitidos', () => {
    expect(lineIndexesToIssue(5, 3)).toEqual([3, 4]);
  });

  it('chaves de pedido e cortesia não colidem', () => {
    expect(orderItemIssuanceKey('item1', 0)).not.toBe(complimentaryIssuanceKey('item1', 0));
  });
});
