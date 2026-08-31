import {
  authorizeRequestedFields,
  fieldAllowedForPopulation,
} from './fields/field.registry';
import { getPresetDefinition } from './presets/preset.registry';
import {
  compensationAmountAtDate,
  receivesCompensationAtDate,
  startOfDay,
} from '../rh/employment-compensation.util';
import {
  calcAgeFromBirthDate,
  isActiveEmployment,
  isCurrentBidPlayer,
  isLoanedPlayer,
  parseRegistrationProfile,
  resolveBankData,
} from './populations/population.util';

describe('Dynamic Reports — population.util', () => {
  const bidProfile = {
    sports: {
      situation: 'ativo',
      cbf: '123456',
      documentationApprovedAt: '2026-01-01T00:00:00.000Z',
    },
  };

  const loanedProfile = {
    sports: { situation: 'emprestado', cbf: '999' },
    loan: { destinationClub: 'Clube X', startDate: '2026-01-01', endDate: '2026-12-31' },
  };

  it('current BID inclui ativo com CBF e documentação', () => {
    expect(isCurrentBidPlayer(bidProfile, '123456')).toBe(true);
  });

  it('current BID exclui emprestado', () => {
    expect(isCurrentBidPlayer(loanedProfile, '999')).toBe(false);
  });

  it('current BID exclui ativo sem CBF', () => {
    expect(
      isCurrentBidPlayer(
        { sports: { situation: 'ativo', documentationApprovedAt: '2026-01-01' } },
        null,
      ),
    ).toBe(false);
  });

  it('loaned population reconhece emprestado', () => {
    expect(isLoanedPlayer(loanedProfile)).toBe(true);
    expect(isLoanedPlayer(bidProfile)).toBe(false);
  });
});

describe('Dynamic Reports — bank resolver', () => {
  it('prioriza extras sobre employment bankData', () => {
    const profile = parseRegistrationProfile({
      extras: { bankName: 'Nubank', pixKey: 'pix@extras' },
    });
    const bank = resolveBankData(profile, { bank: 'Outro', pix: 'pix-rh' }, 'pix-employee');
    expect(bank.bankName).toBe('Nubank');
    expect(bank.pixKey).toBe('pix@extras');
  });
});

describe('Dynamic Reports — ACL', () => {
  it('remove CPF para usuário sem módulos sensíveis', () => {
    const { allowed, stripped } = authorizeRequestedFields(
      ['fullName', 'cpf', 'bankName'],
      'player.athletes',
      ['relatorios_adm'],
      false,
    );
    expect(allowed).toEqual(['fullName']);
    expect(stripped).toContain('cpf');
    expect(stripped).toContain('bankName');
  });

  it('permite CPF e banco para adm_rh', () => {
    const { allowed } = authorizeRequestedFields(
      ['fullName', 'cpf', 'bankName'],
      'player.athletes',
      ['relatorios_adm', 'adm_rh'],
      false,
    );
    expect(allowed).toEqual(['fullName', 'cpf', 'bankName']);
  });

  it('signature é display-only e permitida', () => {
    expect(fieldAllowedForPopulation(
      { key: 'signature', populations: ['people.cafeteria'] } as never,
      'people.cafeteria',
    )).toBe(true);
  });
});

describe('Dynamic Reports — official minutes vs manual counter', () => {
  it('idade calculada a partir de birthDate', () => {
    const age = calcAgeFromBirthDate('2000-01-15');
    expect(age).not.toBeNull();
    expect(age!).toBeGreaterThan(20);
  });
});

describe('Dynamic Reports — employment ativo', () => {
  it('employment ativo sem endDate', () => {
    expect(isActiveEmployment({ status: 'ativo', endDate: null })).toBe(true);
  });

  it('employment desligado não é ativo', () => {
    expect(isActiveEmployment({ status: 'desligado', endDate: null })).toBe(false);
  });
});

describe('Dynamic Reports — cafeteria dedup rule (schema)', () => {
  it('employee com playerId deve ser excluído da seção staff (regra documentada)', () => {
    const staff = [
      { id: 'e1', playerId: 'p1', name: 'João' },
      { id: 'e2', playerId: null, name: 'Maria' },
    ];
    const cafeteriaStaff = staff.filter((e) => !e.playerId);
    expect(cafeteriaStaff).toHaveLength(1);
    expect(cafeteriaStaff[0]?.name).toBe('Maria');
  });
});

describe('Dynamic Reports — selected columns', () => {
  it('campos não autorizados são removidos da lista allowed', () => {
    const { allowed, stripped } = authorizeRequestedFields(
      ['fullName', 'rg'],
      'player.athletes',
      [],
      false,
    );
    expect(allowed).toEqual(['fullName']);
    expect(stripped).toContain('rg');
  });
});

describe('Dynamic Reports — financial ACL', () => {
  it('remove salary para usuário sem adm_rh/financeiro', () => {
    const { allowed, stripped } = authorizeRequestedFields(
      ['fullName', 'salary', 'transportAmount'],
      'player.payroll',
      ['relatorios_adm'],
      false,
    );
    expect(allowed).toEqual(['fullName']);
    expect(stripped).toContain('salary');
    expect(stripped).toContain('transportAmount');
  });

  it('permite campos financeiros para adm_financeiro', () => {
    const { allowed } = authorizeRequestedFields(
      ['salary', 'costAllowanceAmount', 'bankHolderName'],
      'player.payroll',
      ['relatorios_adm', 'adm_financeiro'],
      false,
    );
    expect(allowed).toEqual(['salary', 'costAllowanceAmount', 'bankHolderName']);
  });
});

describe('Dynamic Reports — compensation resolution', () => {
  it('resolve valores na data de referência', () => {
    const date = startOfDay(new Date('2026-07-15T12:00:00'));
    const items = [
      {
        kind: 'COST_ALLOWANCE',
        amount: 1200,
        effectiveFrom: startOfDay(new Date('2026-01-01T12:00:00')),
        effectiveTo: null,
      },
    ];
    expect(receivesCompensationAtDate(items, 'COST_ALLOWANCE', date)).toBe(true);
    expect(compensationAmountAtDate(items, 'COST_ALLOWANCE', date)).toBe(1200);
  });
});

describe('Dynamic Reports — presets Phase 2', () => {
  it('lista refeitório preset intacto', () => {
    const preset = getPresetDefinition('lista_refeitorio');
    expect(preset?.population).toBe('people.cafeteria');
    expect(preset?.defaultFields).toEqual(['fullName', 'signature']);
  });

  it('folha preset usa engine player.payroll', () => {
    const preset = getPresetDefinition('folha_pagamento');
    expect(preset?.population).toBe('player.payroll');
    expect(preset?.defaultFields).toContain('salary');
  });
});
