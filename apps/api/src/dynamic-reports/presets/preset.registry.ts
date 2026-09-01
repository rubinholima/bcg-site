import type {
  DynamicReportPopulationDefinition,
  DynamicReportPresetDefinition,
} from '../dynamic-reports.types';

export const DYNAMIC_REPORT_POPULATIONS: DynamicReportPopulationDefinition[] = [
  {
    key: 'player.current_bid',
    label: 'Atletas no BID (Boston ativo)',
    source: 'player',
    description: 'Ativos com registro CBF e documentação aprovada — exclui emprestados',
    filterKeys: ['search', 'category', 'position', 'season', 'competition'],
  },
  {
    key: 'player.loaned',
    label: 'Atletas emprestados',
    source: 'player',
    filterKeys: ['search', 'category', 'position', 'season', 'competition'],
  },
  {
    key: 'player.payroll',
    label: 'Folha de pagamento (atletas com vínculo RH)',
    source: 'player',
    description: 'Atletas com Employee e vínculo ativo — inclui emprestados com RH',
    filterKeys: ['search', 'category', 'situation', 'position', 'referenceDate'],
  },
  {
    key: 'player.athletes',
    label: 'Atletas (personalizável)',
    source: 'player',
    filterKeys: ['search', 'category', 'situation', 'position', 'season', 'competition', 'referenceDate'],
  },
  {
    key: 'employee.active_staff',
    label: 'Colaboradores ativos',
    source: 'employee',
    filterKeys: ['search', 'departmentId', 'employeeType'],
  },
  {
    key: 'employee.by_department',
    label: 'Colaboradores por departamento',
    source: 'employee',
    filterKeys: ['search', 'departmentId', 'employeeType'],
  },
  {
    key: 'people.cafeteria',
    label: 'Lista refeitório (atletas + staff)',
    source: 'people',
    filterKeys: ['search'],
  },
];

export const DYNAMIC_REPORT_PRESETS: DynamicReportPresetDefinition[] = [
  {
    id: 'personalizado',
    label: 'Personalizado',
    population: 'player.athletes',
    defaultFields: ['fullName', 'birthDate', 'category', 'position'],
    sortBy: 'fullName',
    sortDir: 'asc',
    groupBy: 'none',
  },
  {
    id: 'lista_refeitorio',
    label: 'Lista Refeitório',
    population: 'people.cafeteria',
    defaultFields: ['athletePhoto', 'fullName', 'category', 'signature'],
    sortBy: 'fullName',
    sortDir: 'asc',
    groupBy: 'cafeteria',
    lockedFields: true,
  },
  {
    id: 'folha_pagamento',
    label: 'Folha de Pagamento',
    population: 'player.payroll',
    defaultFields: [
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
    ],
    sortBy: 'fullName',
    sortDir: 'asc',
    groupBy: 'category',
  },
  {
    id: 'seguro_vida',
    label: 'Seguro de Vida',
    population: 'player.payroll',
    defaultFields: [
      'fullName',
      'birthDate',
      'rg',
      'cpf',
      'employmentContractType',
      'receivesTransport',
      'transportAmount',
      'receivesMeal',
      'mealAmount',
      'receivesCostAllowance',
      'costAllowanceAmount',
    ],
    sortBy: 'fullName',
    sortDir: 'asc',
    groupBy: 'none',
  },
  {
    id: 'ajuda_custo',
    label: 'Ajuda de Custo',
    population: 'player.payroll',
    defaultFields: [
      'fullName',
      'category',
      'birthDate',
      'rg',
      'cpf',
      'bankName',
      'bankAgency',
      'bankAccount',
      'bankAccountType',
      'pixKey',
      'bankHolderName',
      'bankHolderCpf',
      'receivesCostAllowance',
      'costAllowanceAmount',
    ],
    sortBy: 'fullName',
    sortDir: 'asc',
    groupBy: 'category',
  },
];

export function getPopulationDefinition(key: string): DynamicReportPopulationDefinition | undefined {
  return DYNAMIC_REPORT_POPULATIONS.find((p) => p.key === key);
}

export function getPresetDefinition(id: string): DynamicReportPresetDefinition | undefined {
  return DYNAMIC_REPORT_PRESETS.find((p) => p.id === id);
}

export const DYNAMIC_REPORT_SORT_OPTIONS = [
  { key: 'fullName', label: 'Nome', populations: ['player.current_bid', 'player.loaned', 'player.athletes', 'player.payroll', 'people.cafeteria'] },
  { key: 'employeeFullName', label: 'Nome', populations: ['employee.active_staff', 'employee.by_department'] },
  { key: 'category', label: 'Categoria', populations: ['player.current_bid', 'player.loaned', 'player.athletes', 'player.payroll', 'people.cafeteria'] },
  { key: 'department', label: 'Departamento', populations: ['employee.active_staff', 'employee.by_department', 'people.cafeteria'] },
  { key: 'birthDate', label: 'Data de nascimento', populations: ['player.current_bid', 'player.loaned', 'player.athletes', 'player.payroll'] },
  { key: 'officialMatchMinutes', label: 'Min. de jogo', populations: ['player.current_bid', 'player.loaned', 'player.athletes'] },
  { key: 'salary', label: 'Salário', populations: ['player.payroll', 'player.athletes', 'player.current_bid', 'player.loaned'] },
];

export const DYNAMIC_REPORT_GROUP_OPTIONS = [
  { key: 'none', label: 'Sem agrupamento', populations: ['player.current_bid', 'player.loaned', 'player.athletes', 'player.payroll', 'employee.active_staff', 'employee.by_department'] },
  { key: 'category', label: 'Por categoria', populations: ['player.current_bid', 'player.loaned', 'player.athletes', 'player.payroll'] },
  { key: 'department', label: 'Por departamento', populations: ['employee.active_staff', 'employee.by_department'] },
  { key: 'cafeteria', label: 'Refeitório (categoria + departamento)', populations: ['people.cafeteria'] },
];
