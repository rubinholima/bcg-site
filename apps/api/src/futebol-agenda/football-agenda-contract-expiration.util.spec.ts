import { isContractExpirationAgendaItem } from './football-agenda-contract-expiration.util';

describe('isContractExpirationAgendaItem', () => {
  it('detecta externalId Beatscode contract', () => {
    expect(
      isContractExpirationAgendaItem({
        externalId: 'beatscode-contract-sub20-2026-08-25-vencimento',
        title: 'João Silva',
        type: 'compromisso',
      }),
    ).toBe(true);
  });

  it('detecta título de vencimento de contrato', () => {
    expect(
      isContractExpirationAgendaItem({
        title: 'Vencimento de contrato — Maria',
        type: 'compromisso',
      }),
    ).toBe(true);
  });

  it('não confunde treino ou reunião comum', () => {
    expect(
      isContractExpirationAgendaItem({
        title: 'Treino campo 1',
        type: 'treino',
      }),
    ).toBe(false);
    expect(
      isContractExpirationAgendaItem({
        title: 'Reunião de contratação',
        type: 'reuniao',
      }),
    ).toBe(false);
  });
});
