/** Campos disponíveis para mapeamento PDF → dados do RH (todos os tipos de vínculo). */
export const CONTRACT_DATA_FIELD_CATALOG = [
  { key: 'employee.name', label: 'Nome completo' },
  { key: 'employee.type', label: 'Tipo de colaborador (funcionário, estágio…)' },
  { key: 'employee.code', label: 'Matrícula RH' },
  { key: 'employee.cpf', label: 'CPF' },
  { key: 'employee.rg', label: 'RG' },
  { key: 'employee.email', label: 'E-mail' },
  { key: 'employee.phone', label: 'Telefone' },
  { key: 'employee.birthDate', label: 'Data de nascimento' },
  { key: 'employee.pisNumber', label: 'PIS' },
  { key: 'employee.voterTitle', label: 'Título de eleitor' },
  { key: 'employee.pixKey', label: 'Chave PIX' },
  { key: 'employee.ctpsUrl', label: 'CTPS digital (URL)' },
  { key: 'employee.addressFull', label: 'Endereço completo' },
  { key: 'employee.addressStreet', label: 'Logradouro' },
  { key: 'employee.addressNumber', label: 'Número' },
  { key: 'employee.addressNeighborhood', label: 'Bairro' },
  { key: 'employee.addressCity', label: 'Cidade' },
  { key: 'employee.addressState', label: 'UF' },
  { key: 'employee.addressZip', label: 'CEP' },
  { key: 'employment.contractType', label: 'Tipo de contrato do vínculo' },
  { key: 'employment.startDate', label: 'Data de admissão / início' },
  { key: 'employment.endDate', label: 'Data de término' },
  { key: 'employment.salaryBase', label: 'Salário / bolsa / remuneração' },
  { key: 'employment.status', label: 'Status do vínculo' },
  { key: 'employment.notes', label: 'Observações do vínculo' },
  { key: 'employment.bankName', label: 'Banco' },
  { key: 'employment.bankAgency', label: 'Agência' },
  { key: 'employment.bankAccount', label: 'Conta bancária' },
  { key: 'employment.cbfRegistration', label: 'Nº registro CBF (atleta)' },
  { key: 'employment.contractValidity', label: 'Validade contrato atleta' },
  { key: 'jobRole.name', label: 'Cargo' },
  { key: 'department.name', label: 'Departamento' },
  { key: 'tenant.name', label: 'Empresa / Clube' },
  { key: 'today', label: 'Data de hoje' },
] as const;

export type ContractDataFieldKey = (typeof CONTRACT_DATA_FIELD_CATALOG)[number]['key'];

const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  staff: 'FUNCIONÁRIO',
  comissao_tecnica: 'COMISSÃO TÉCNICA',
  dirigente: 'DIRIGENTE',
  athlete: 'ATLETA',
  temporario: 'TEMPORÁRIO',
  estagio: 'ESTÁGIO',
};

const AUTO_GUESS: Record<string, ContractDataFieldKey> = {
  nome: 'employee.name',
  nome_completo: 'employee.name',
  name: 'employee.name',
  colaborador: 'employee.name',
  matricula: 'employee.code',
  tipo_colaborador: 'employee.type',
  cpf: 'employee.cpf',
  rg: 'employee.rg',
  email: 'employee.email',
  e_mail: 'employee.email',
  telefone: 'employee.phone',
  phone: 'employee.phone',
  celular: 'employee.phone',
  nascimento: 'employee.birthDate',
  data_nascimento: 'employee.birthDate',
  birthdate: 'employee.birthDate',
  pis: 'employee.pisNumber',
  titulo_eleitor: 'employee.voterTitle',
  pix: 'employee.pixKey',
  ctps: 'employee.ctpsUrl',
  endereco: 'employee.addressFull',
  logradouro: 'employee.addressStreet',
  numero: 'employee.addressNumber',
  bairro: 'employee.addressNeighborhood',
  cidade: 'employee.addressCity',
  uf: 'employee.addressState',
  cep: 'employee.addressZip',
  cargo: 'jobRole.name',
  funcao: 'jobRole.name',
  departamento: 'department.name',
  empresa: 'tenant.name',
  clube: 'tenant.name',
  salario: 'employment.salaryBase',
  salario_base: 'employment.salaryBase',
  remuneracao: 'employment.salaryBase',
  bolsa: 'employment.salaryBase',
  bolsa_estagio: 'employment.salaryBase',
  admissao: 'employment.startDate',
  data_admissao: 'employment.startDate',
  data_inicio: 'employment.startDate',
  inicio: 'employment.startDate',
  termino: 'employment.endDate',
  data_fim: 'employment.endDate',
  tipo_contrato: 'employment.contractType',
  banco: 'employment.bankName',
  agencia: 'employment.bankAgency',
  conta: 'employment.bankAccount',
  cbf: 'employment.cbfRegistration',
  registro_cbf: 'employment.cbfRegistration',
  validade_contrato: 'employment.contractValidity',
  observacoes: 'employment.notes',
  hoje: 'today',
  data_hoje: 'today',
};

function normalizeFieldToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function guessDataKeyForPdfField(pdfFieldName: string): ContractDataFieldKey | null {
  const token = normalizeFieldToken(pdfFieldName);
  if (AUTO_GUESS[token]) return AUTO_GUESS[token];
  for (const [pattern, key] of Object.entries(AUTO_GUESS)) {
    if (token.includes(pattern) || pattern.includes(token)) return key;
  }
  return null;
}

export function buildDefaultFieldMapping(pdfFieldNames: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const name of pdfFieldNames) {
    const guess = guessDataKeyForPdfField(name);
    if (guess) mapping[name] = guess;
  }
  return mapping;
}

interface EmployeeAddressJson {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

interface BankDataJson {
  bank?: string | null;
  agency?: string | null;
  account?: string | null;
  pix?: string | null;
}

interface AthleteDataJson {
  numeroRegistroCBF?: string | null;
  dataValidadeContrato?: string | null;
  clausulaPenal?: string | null;
}

export interface EmploymentContractContextInput {
  tenant: { name: string };
  employee: {
    name: string;
    type?: string | null;
    code?: string | null;
    cpf?: string | null;
    rg?: string | null;
    email?: string | null;
    phone?: string | null;
    birthDate?: Date | string | null;
    pisNumber?: string | null;
    voterTitle?: string | null;
    pixKey?: string | null;
    ctpsUrl?: string | null;
    address?: unknown;
  };
  jobRole: { name: string };
  department?: { name: string } | null;
  employment: {
    contractType: string;
    startDate: Date | string;
    endDate?: Date | string | null;
    salaryBase?: number | null;
    status: string;
    notes?: string | null;
    bankData?: unknown;
    athleteData?: unknown;
  };
}

function formatDatePt(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatCpf(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length !== 11) return (value ?? '').trim();
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseAddress(raw: unknown): EmployeeAddressJson {
  if (!raw || typeof raw !== 'object') return {};
  return raw as EmployeeAddressJson;
}

function parseBank(raw: unknown): BankDataJson {
  if (!raw || typeof raw !== 'object') return {};
  return raw as BankDataJson;
}

function parseAthlete(raw: unknown): AthleteDataJson {
  if (!raw || typeof raw !== 'object') return {};
  return raw as AthleteDataJson;
}

function formatAddressFull(addr: EmployeeAddressJson): string {
  const parts = [
    [addr.street, addr.number].filter(Boolean).join(', '),
    addr.complement,
    addr.neighborhood,
    [addr.city, addr.state].filter(Boolean).join(' - '),
    addr.zipCode,
  ].filter(Boolean);
  return parts.join(' — ').toUpperCase();
}

export function employmentToContractContext(row: {
  tenant: { name: string };
  employee: EmploymentContractContextInput['employee'] & Record<string, unknown>;
  jobRole: { name: string };
  department?: { name: string } | null;
  contractType: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  salaryBase?: number | null;
  status: string;
  notes?: string | null;
  bankData?: unknown;
  athleteData?: unknown;
}): EmploymentContractContextInput {
  return {
    tenant: row.tenant,
    employee: row.employee,
    jobRole: row.jobRole,
    department: row.department,
    employment: {
      contractType: row.contractType,
      startDate: row.startDate,
      endDate: row.endDate,
      salaryBase: row.salaryBase,
      status: row.status,
      notes: row.notes,
      bankData: row.bankData,
      athleteData: row.athleteData,
    },
  };
}

export function buildEmploymentContractData(
  input: EmploymentContractContextInput,
): Record<ContractDataFieldKey, string> {
  const addr = parseAddress(input.employee.address);
  const bank = parseBank(input.employment.bankData);
  const athlete = parseAthlete(input.employment.athleteData);
  const today = new Date();
  const empType = (input.employee.type ?? '').trim().toLowerCase();

  return {
    'employee.name': input.employee.name?.trim().toUpperCase() ?? '',
    'employee.type': EMPLOYEE_TYPE_LABELS[empType] ?? empType.toUpperCase(),
    'employee.code': (input.employee.code ?? '').trim().toUpperCase(),
    'employee.cpf': formatCpf(input.employee.cpf),
    'employee.rg': (input.employee.rg ?? '').trim().toUpperCase(),
    'employee.email': (input.employee.email ?? '').trim().toLowerCase(),
    'employee.phone': (input.employee.phone ?? '').trim(),
    'employee.birthDate': formatDatePt(input.employee.birthDate),
    'employee.pisNumber': (input.employee.pisNumber ?? '').trim().toUpperCase(),
    'employee.voterTitle': (input.employee.voterTitle ?? '').trim().toUpperCase(),
    'employee.pixKey': (input.employee.pixKey ?? '').trim(),
    'employee.ctpsUrl': (input.employee.ctpsUrl ?? '').trim(),
    'employee.addressFull': formatAddressFull(addr),
    'employee.addressStreet': (addr.street ?? '').trim().toUpperCase(),
    'employee.addressNumber': (addr.number ?? '').trim().toUpperCase(),
    'employee.addressNeighborhood': (addr.neighborhood ?? '').trim().toUpperCase(),
    'employee.addressCity': (addr.city ?? '').trim().toUpperCase(),
    'employee.addressState': (addr.state ?? '').trim().toUpperCase(),
    'employee.addressZip': (addr.zipCode ?? '').trim(),
    'employment.contractType': input.employment.contractType?.trim().toUpperCase() ?? '',
    'employment.startDate': formatDatePt(input.employment.startDate),
    'employment.endDate': formatDatePt(input.employment.endDate),
    'employment.salaryBase': formatMoney(input.employment.salaryBase),
    'employment.status': input.employment.status?.trim().toUpperCase() ?? '',
    'employment.notes': (input.employment.notes ?? '').trim().toUpperCase(),
    'employment.bankName': (bank.bank ?? '').trim().toUpperCase(),
    'employment.bankAgency': (bank.agency ?? '').trim().toUpperCase(),
    'employment.bankAccount': (bank.account ?? '').trim().toUpperCase(),
    'employment.cbfRegistration': (athlete.numeroRegistroCBF ?? '').trim().toUpperCase(),
    'employment.contractValidity': athlete.dataValidadeContrato
      ? formatDatePt(athlete.dataValidadeContrato)
      : '',
    'jobRole.name': input.jobRole.name?.trim().toUpperCase() ?? '',
    'department.name': (input.department?.name ?? '').trim().toUpperCase(),
    'tenant.name': input.tenant.name?.trim().toUpperCase() ?? '',
    today: today.toLocaleDateString('pt-BR'),
  };
}

export function resolvePdfFieldValues(
  fieldMapping: Record<string, string> | null | undefined,
  data: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fieldMapping) return out;
  for (const [pdfField, dataKey] of Object.entries(fieldMapping)) {
    const value = data[dataKey];
    if (value != null && String(value).trim()) out[pdfField] = String(value);
  }
  return out;
}

/** Filtra modelos compatíveis com o tipo de vínculo (CLT, PJ, estágio, atleta…). */
export function templateMatchesEmploymentContractType(
  templateType: string,
  employmentContractType: string,
): boolean {
  const tt = templateType.trim().toLowerCase();
  if (tt === 'outro') return true;
  const ct = employmentContractType.trim().toLowerCase();
  if (tt === ct) return true;
  const map: Record<string, string[]> = {
    clt: ['clt', 'contrato_trabalho', 'aditivo', 'rescisao', 'outro'],
    pj: ['pj', 'aditivo', 'rescisao', 'nda', 'outro'],
    estagio: ['estagio', 'aditivo', 'rescisao', 'outro'],
    atleta: ['atleta', 'formacao', 'contrato_imagem', 'transferencia', 'aditivo', 'rescisao', 'outro'],
  };
  const allowed = map[ct] ?? [];
  return allowed.includes(tt);
}
