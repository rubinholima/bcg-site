import {
  ATHLETE_REPORT_POPULATIONS,
  canAccessDynamicReportField,
  filterFieldsForAccessContext,
  hasFootballManagementAthleteReportAccess,
  isAthleteReportPopulation,
} from './field-access.util';
import { authorizeRequestedFields, getFieldDefinition } from './fields/field.registry';

const FOOTBALL_MODULES = ['relatorios_futebol', 'futebol_logistica'];
const RH_MODULES = ['relatorios_adm', 'adm_rh'];
const FINANCE_MODULES = ['relatorios_adm', 'adm_financeiro'];

const SENSITIVE_ATHLETE = [
  'cpf',
  'rg',
  'salary',
  'bankName',
  'bankAgency',
  'bankAccount',
  'pixKey',
  'pixKeyType',
  'bankHolderName',
  'bankHolderCpf',
  'receivesTransport',
  'transportAmount',
  'receivesMeal',
  'mealAmount',
  'receivesCostAllowance',
  'costAllowanceAmount',
  'receivesImageRights',
  'imageRightsAmount',
  'employmentContractType',
  'bankOperation',
] as const;

describe('field-access.util — athlete populations', () => {
  it('lista populações de atleta canônicas', () => {
    expect(ATHLETE_REPORT_POPULATIONS).toEqual([
      'player.current_bid',
      'player.loaned',
      'player.athletes',
      'player.payroll',
    ]);
  });

  it('people.cafeteria não é população de atleta', () => {
    expect(isAthleteReportPopulation('people.cafeteria')).toBe(false);
  });
});

describe('field-access.util — gestão Futebol + atleta', () => {
  const ctx = (population: string, role: string) => ({
    moduleSlugs: FOOTBALL_MODULES,
    population,
    role,
    isSuperAdmin: false,
  });

  it.each(['gerente', 'supervisor', 'gestor'] as const)(
    '%s + player.athletes libera campos sensíveis de atleta',
    (role) => {
      expect(hasFootballManagementAthleteReportAccess(ctx('player.athletes', role))).toBe(true);
      for (const key of SENSITIVE_ATHLETE) {
        const field = getFieldDefinition(key);
        expect(field).toBeDefined();
        expect(canAccessDynamicReportField(field!, ctx('player.athletes', role))).toBe(true);
      }
    },
  );

  it.each(['player.current_bid', 'player.loaned', 'player.payroll'] as const)(
    'supervisor acessa sensíveis em %s quando aplicável',
    (population) => {
      const { allowed } = authorizeRequestedFields(
        ['fullName', ...SENSITIVE_ATHLETE],
        population,
        FOOTBALL_MODULES,
        false,
        'supervisor',
      );
      expect(allowed).toContain('cpf');
      expect(allowed).toContain('salary');
      expect(allowed).toContain('bankName');
    },
  );
});

describe('field-access.util — proteção staff', () => {
  it('supervisor Futebol não acessa salary em employee.active_staff', () => {
    const { allowed, stripped } = authorizeRequestedFields(
      ['employeeFullName', 'salary', 'cpf', 'bankName'],
      'employee.active_staff',
      FOOTBALL_MODULES,
      false,
      'supervisor',
    );
    expect(allowed).toEqual(['employeeFullName']);
    expect(stripped).toContain('salary');
    expect(stripped).toContain('cpf');
    expect(stripped).toContain('bankName');
  });

  it('rejeita request manual employee + salary para gestão Futebol', () => {
    const { allowed } = authorizeRequestedFields(
      ['salary', 'cpf'],
      'employee.by_department',
      FOOTBALL_MODULES,
      false,
      'gerente',
    );
    expect(allowed).toEqual([]);
  });

  it('permite request manual player.athletes + salary para gestão Futebol', () => {
    const { allowed } = authorizeRequestedFields(
      ['fullName', 'salary', 'cpf'],
      'player.athletes',
      FOOTBALL_MODULES,
      false,
      'gerente',
    );
    expect(allowed).toEqual(['fullName', 'salary', 'cpf']);
  });
});

describe('field-access.util — cafeteria mista', () => {
  it('operacionais permitidos; sensíveis negados para gestão Futebol', () => {
    const ctx = {
      moduleSlugs: FOOTBALL_MODULES,
      population: 'people.cafeteria',
      role: 'supervisor',
      isSuperAdmin: false,
    };
    expect(canAccessDynamicReportField(getFieldDefinition('fullName')!, ctx)).toBe(true);
    expect(canAccessDynamicReportField(getFieldDefinition('athletePhoto')!, ctx)).toBe(true);
    expect(canAccessDynamicReportField(getFieldDefinition('signature')!, ctx)).toBe(true);
    expect(canAccessDynamicReportField(getFieldDefinition('cpf')!, ctx)).toBe(false);
    expect(canAccessDynamicReportField(getFieldDefinition('salary')!, ctx)).toBe(false);
  });
});

describe('field-access.util — domínios RH/Financeiro/Diretoria preservados', () => {
  it('adm_rh mantém acesso a CPF em atletas', () => {
    const { allowed } = authorizeRequestedFields(
      ['cpf', 'salary'],
      'player.athletes',
      RH_MODULES,
      false,
      'rh',
    );
    expect(allowed).toEqual(['cpf', 'salary']);
  });

  it('adm_financeiro mantém banco sem CPF', () => {
    const { allowed, stripped } = authorizeRequestedFields(
      ['cpf', 'bankName', 'salary'],
      'player.payroll',
      FINANCE_MODULES,
      false,
      'financeiro',
    );
    expect(allowed).toEqual(['bankName', 'salary']);
    expect(stripped).toContain('cpf');
  });

  it('diretoria mantém CPF/RG sem salário', () => {
    const { allowed, stripped } = authorizeRequestedFields(
      ['cpf', 'rg', 'salary'],
      'player.athletes',
      ['relatorios_futebol', 'diretoria'],
      false,
      'diretoria',
    );
    expect(allowed).toEqual(['cpf', 'rg']);
    expect(stripped).toContain('salary');
  });

  it('super_admin libera todos os campos da população', () => {
    const fields = filterFieldsForAccessContext(
      SENSITIVE_ATHLETE.map((k) => getFieldDefinition(k)!),
      {
        moduleSlugs: [],
        population: 'player.athletes',
        role: 'super_admin',
        isSuperAdmin: true,
      },
    );
    expect(fields.map((f) => f.key).sort()).toEqual([...SENSITIVE_ATHLETE].sort());
  });
});

describe('field-access.util — presets folha/seguro/ajuda', () => {
  it('folha_pagamento completo para supervisor Futebol', () => {
    const presetFields = [
      'fullName',
      'category',
      'sportsSituation',
      'employmentContractType',
      'salary',
      'receivesImageRights',
      'imageRightsAmount',
      'receivesCostAllowance',
      'costAllowanceAmount',
      'receivesTransport',
      'transportAmount',
      'receivesMeal',
      'mealAmount',
    ];
    const { allowed, stripped } = authorizeRequestedFields(
      presetFields,
      'player.payroll',
      FOOTBALL_MODULES,
      false,
      'supervisor',
    );
    expect(stripped).toEqual([]);
    expect(allowed).toEqual(presetFields);
  });

  it('seguro_vida com CPF/RG para gerente Futebol', () => {
    const { allowed } = authorizeRequestedFields(
      ['fullName', 'birthDate', 'rg', 'cpf', 'employmentContractType', 'receivesCostAllowance', 'costAllowanceAmount'],
      'player.payroll',
      FOOTBALL_MODULES,
      false,
      'gerente',
    );
    expect(allowed).toContain('cpf');
    expect(allowed).toContain('rg');
    expect(allowed).toContain('costAllowanceAmount');
  });
});

describe('field-access.util — relatorios_futebol obrigatório', () => {
  it('gerente sem relatorios_futebol não recebe exceção', () => {
    const { allowed } = authorizeRequestedFields(
      ['cpf', 'salary'],
      'player.athletes',
      ['futebol_logistica'],
      false,
      'gerente',
    );
    expect(allowed).toEqual([]);
  });
});
