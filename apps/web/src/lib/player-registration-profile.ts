export interface PlayerAddressBlock {
  street?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  zipCode?: string;
  phone?: string;
}

export interface PlayerRegistrationProfile {
  personal?: {
    rhEnrollment?: string;
    clubArrivalDate?: string;
    nickname?: string;
    cpf?: string;
    rg?: string;
    rgIssuer?: string;
    rgValidUntil?: string;
    maritalStatus?: string;
    gender?: string;
    birthPlace?: string;
    otherNationalities?: string;
  };
  sports?: {
    jerseyName?: string;
    situation?: string;
    cbf?: string;
    localFedRegistration?: string;
    comet?: string;
    cbfs?: string;
    localFedRegistrationFutsal?: string;
    internationalized?: boolean;
    footballSchool?: string;
    footballSchoolCity?: string;
    previousClub?: string;
    previousClubCity?: string;
  };
  address?: {
    useClubAddress?: boolean;
    main?: PlayerAddressBlock;
    local?: PlayerAddressBlock;
  };
  complement?: {
    skinColor?: string;
    rhFactor?: string;
    physicalBiotype?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    costCenter?: string;
    personalWebsite?: string;
    mainSocialNetwork?: string;
    observation?: string;
  };
  extras?: {
    pixKeyType?: string;
    pixBank?: string;
    pixKey?: string;
    healthPlanOperator?: string;
    healthPlanInclusionDate?: string;
    healthPlanRegistration?: string;
    healthPlanExpiryDate?: string;
    healthPlanExclusionDate?: string;
    ctpsNumber?: string;
    ctpsSeries?: string;
    voterIdNumber?: string;
    voterZone?: string;
    voterSection?: string;
    voterCity?: string;
    educationLevel?: string;
    schoolName?: string;
    schoolGrade?: string;
    schoolPeriod?: string[];
    bankName?: string;
    bankAccountType?: string;
    bankAgency?: string;
    bankOperation?: string;
    bankAccountNumber?: string;
    observation?: string;
  };
  characteristics?: {
    technical?: string;
    tactical?: string;
    physical?: string;
    additional?: string;
  };
  agent?: {
    hasAgent?: boolean;
    observation?: string;
  };
  clothing?: {
    shirt?: string;
    tshirt?: string;
    sweatshirt?: string;
    pants?: string;
    shorts?: string;
    jacket?: string;
    suit?: string;
    blazer?: string;
    dressShoe?: string;
    cleats?: string;
    sneakers?: string;
    flipFlops?: string;
    notes?: string;
  };
  travel?: {
    passports?: PlayerPassport[];
    visas?: PlayerTravelVisa[];
    loyaltyPrograms?: PlayerLoyaltyProgram[];
  };
  documents?: PlayerRegistrationDocument[];
  contracts?: {
    economicRights?: PlayerEconomicRight[];
  };
  categoryHistory?: PlayerCategoryHistoryEntry[];
  /** Dados do empréstimo (situação = emprestado) */
  loan?: PlayerLoanInfo;
}

export interface PlayerLoanInfo {
  destinationClub?: string;
  startDate?: string;
  endDate?: string;
  psychologicalSupport?: boolean;
  notes?: string;
}

export interface PlayerCategoryHistoryEntry {
  id: string;
  displayId?: number;
  /** Categoria em que estava (Na Categoria) */
  fromCategory?: string | null;
  entryDate: string;
  exitDate?: string | null;
  /** Categoria para qual migrou (Para Categoria) */
  toCategory?: string | null;
  migrationType: "automatic" | "manual";
  updatedAt: string;
  responsible?: string;
}

export interface PlayerEconomicRight {
  id: string;
  clubName: string;
  percentage: number;
}

export interface PlayerRegistrationDocument {
  id: string;
  name: string;
  documentType: string;
  fileKey?: string;
  fileUrl: string;
  uploadedAt: string;
}

export const PLAYER_DOCUMENT_TYPE_OPTIONS = [
  { value: "rg", label: "RG" },
  { value: "cpf", label: "CPF" },
  { value: "ctps", label: "CTPS" },
  { value: "certidao", label: "Certidão" },
  { value: "comprovante_residencia", label: "Comprovante de residência" },
  { value: "documento_esportivo", label: "Documento esportivo" },
  { value: "outro", label: "Outros" },
] as const;

export function getPlayerDocumentTypeLabel(value: string): string {
  return PLAYER_DOCUMENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function normalizeDocumentsProfile(
  documents: PlayerRegistrationProfile["documents"],
): PlayerRegistrationDocument[] {
  return Array.isArray(documents) ? documents : [];
}

export function normalizeEconomicRights(
  profile: PlayerRegistrationProfile,
  tenantName?: string | null,
): PlayerEconomicRight[] {
  const rows = profile.contracts?.economicRights;
  if (Array.isArray(rows) && rows.length > 0) return rows;
  if (tenantName?.trim()) {
    return [{ id: "default", clubName: tenantName.trim(), percentage: 100 }];
  }
  return [];
}

export interface PlayerPassport {
  id: string;
  number?: string;
  issuingCountry?: string;
  issueDate?: string;
  validUntil?: string;
  authority?: string;
  preferred?: boolean;
}

export interface PlayerTravelVisa {
  id: string;
  country?: string;
  visaType?: string;
  number?: string;
  issueDate?: string;
  validUntil?: string;
  passportNumber?: string;
}

export interface PlayerLoyaltyProgram {
  id: string;
  transportCompany?: string;
  programName?: string;
  membershipNumber?: string;
}

export function createTravelRowId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `travel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeTravelProfile(travel: PlayerRegistrationProfile["travel"]): NonNullable<PlayerRegistrationProfile["travel"]> {
  return {
    passports: Array.isArray(travel?.passports) ? travel.passports : [],
    visas: Array.isArray(travel?.visas) ? travel.visas : [],
    loyaltyPrograms: Array.isArray(travel?.loyaltyPrograms) ? travel.loyaltyPrograms : [],
  };
}

export function parseRegistrationProfile(raw: unknown): PlayerRegistrationProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as PlayerRegistrationProfile;
}

export function normalizeCpfDigits(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Valida identificadores obrigatórios do cadastro (CPF para RH/contratos). */
export function getRegistrationIdentifiersError(profile: PlayerRegistrationProfile): string | null {
  if (normalizeCpfDigits(profile.personal?.cpf).length < 11) {
    return "Preencha o CPF do atleta (11 dígitos).";
  }
  return null;
}

export function computeAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export const MARITAL_STATUS_OPTIONS = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_estavel", label: "União estável" },
] as const;

export const GENDER_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
  { value: "nao_informar", label: "Prefiro não informar" },
] as const;

export const SKIN_COLOR_OPTIONS = [
  { value: "branca", label: "Branca" },
  { value: "preta", label: "Preta" },
  { value: "parda", label: "Parda" },
  { value: "amarela", label: "Amarela" },
  { value: "indigena", label: "Indígena" },
  { value: "nao_informar", label: "Não informar" },
] as const;

export const RH_FACTOR_OPTIONS = [
  { value: "a_pos", label: "A+" },
  { value: "a_neg", label: "A-" },
  { value: "b_pos", label: "B+" },
  { value: "b_neg", label: "B-" },
  { value: "ab_pos", label: "AB+" },
  { value: "ab_neg", label: "AB-" },
  { value: "o_pos", label: "O+" },
  { value: "o_neg", label: "O-" },
] as const;

export const SPORTS_SITUATION_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "emprestado", label: "Emprestado" },
  { value: "teste", label: "Teste" },
  { value: "desligado", label: "Desligado" },
] as const;

/** Valores Beatscode/legado em inglês → pt-BR canônico */
const SPORTS_SITUATION_ALIASES: Record<string, string> = {
  ativo: "ativo",
  emprestado: "emprestado",
  teste: "teste",
  desligado: "desligado",
  inativo: "desligado",
  elenco: "ativo",
  definitive: "ativo",
  active: "ativo",
  inative: "desligado",
  inactive: "desligado",
  loaned: "emprestado",
  loan: "emprestado",
  trial: "teste",
  test: "teste",
};

export function normalizeSportsSituation(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return "ativo";
  const key = raw.toLowerCase();
  return SPORTS_SITUATION_ALIASES[key] ?? key;
}

export function getSportsSituationLabel(value?: string | null): string {
  const norm = normalizeSportsSituation(value);
  return SPORTS_SITUATION_OPTIONS.find((o) => o.value === norm)?.label ?? norm;
}

export function isArchivedSportsSituation(value?: string | null): boolean {
  const norm = normalizeSportsSituation(value);
  return norm === "desligado";
}

export function createCategoryHistoryId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeCategoryHistory(
  history: PlayerRegistrationProfile["categoryHistory"],
): PlayerCategoryHistoryEntry[] {
  return Array.isArray(history) ? history : [];
}

export function formatProfileDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function computeDaysInCategory(entry: PlayerCategoryHistoryEntry): number | null {
  const start = new Date(entry.entryDate.length === 10 ? `${entry.entryDate}T12:00:00` : entry.entryDate);
  if (Number.isNaN(start.getTime())) return null;
  const endRaw = entry.exitDate ?? new Date().toISOString().slice(0, 10);
  const end = new Date(endRaw.length === 10 ? `${endRaw}T12:00:00` : endRaw);
  if (Number.isNaN(end.getTime())) return null;
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : 0;
}

export function computeTotalClubDays(history: PlayerCategoryHistoryEntry[]): number {
  return history.reduce((sum, entry) => sum + (computeDaysInCategory(entry) ?? 0), 0);
}

export function getCategoryMigrationLabel(type: PlayerCategoryHistoryEntry["migrationType"]): string {
  return type === "automatic" ? "Automático" : "Manual";
}

export function seedCategoryHistoryIfEmpty(
  profile: PlayerRegistrationProfile,
  currentCategory: string | null | undefined,
  responsible: string,
): PlayerRegistrationProfile {
  if (!currentCategory?.trim()) return profile;
  const history = normalizeCategoryHistory(profile.categoryHistory);
  if (history.length > 0) return profile;
  const entryDate = profile.personal?.clubArrivalDate?.trim() || new Date().toISOString().slice(0, 10);
  return {
    ...profile,
    categoryHistory: [
      {
        id: createCategoryHistoryId(),
        displayId: 1001,
        entryDate,
        toCategory: currentCategory,
        migrationType: "automatic",
        updatedAt: new Date().toISOString(),
        responsible,
      },
    ],
  };
}

export function appendCategoryHistoryOnChange(
  profile: PlayerRegistrationProfile,
  params: {
    previousCategory: string | null | undefined;
    newCategory: string | null | undefined;
    responsible: string;
    migrationType?: PlayerCategoryHistoryEntry["migrationType"];
  },
): PlayerRegistrationProfile {
  const { previousCategory, newCategory, responsible, migrationType = "automatic" } = params;
  if (previousCategory === newCategory) return profile;

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  let history = normalizeCategoryHistory(profile.categoryHistory);

  if (history.length === 0 && previousCategory) {
    history = [
      {
        id: createCategoryHistoryId(),
        displayId: 1001,
        entryDate: profile.personal?.clubArrivalDate?.trim() || today,
        toCategory: previousCategory,
        migrationType: "automatic",
        updatedAt: now,
        responsible,
      },
    ];
  }

  if (history.length > 0) {
    const lastIdx = history.length - 1;
    const last = history[lastIdx];
    if (!last.exitDate) {
      history = history.map((row, i) =>
        i === lastIdx
          ? {
              ...row,
              exitDate: today,
              toCategory: newCategory ?? row.toCategory,
              updatedAt: now,
              responsible,
            }
          : row,
      );
    }
  }

  if (newCategory?.trim()) {
    const maxDisplay = history.reduce((max, row) => Math.max(max, row.displayId ?? 1000), 1000);
    history = [
      ...history,
      {
        id: createCategoryHistoryId(),
        displayId: maxDisplay + 1,
        fromCategory: previousCategory ?? undefined,
        entryDate: today,
        toCategory: newCategory,
        migrationType,
        updatedAt: now,
        responsible,
      },
    ];
  }

  return { ...profile, categoryHistory: history };
}

export function normalizeLoanProfile(loan: PlayerRegistrationProfile["loan"]): PlayerLoanInfo {
  if (!loan || typeof loan !== "object") return {};
  return loan;
}

export function getLoanPsychologicalSupportLabel(value?: boolean | null): string {
  if (value === true) return "Sim";
  if (value === false) return "Não";
  return "—";
}

export function isLoanedPlayer(profile: PlayerRegistrationProfile): boolean {
  return normalizeSportsSituation(profile.sports?.situation) === "emprestado";
}

export const PIX_KEY_TYPE_OPTIONS = [
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave aleatória" },
] as const;

export const CLOTHING_SIZE_FIELDS = [
  { key: "shirt", label: "Tamanho camisa" },
  { key: "tshirt", label: "Tamanho camiseta" },
  { key: "sweatshirt", label: "Tamanho moletom" },
  { key: "pants", label: "Tamanho calça" },
  { key: "shorts", label: "Tamanho calção" },
  { key: "jacket", label: "Tamanho jaqueta/parka" },
  { key: "suit", label: "Tamanho terno" },
  { key: "blazer", label: "Tamanho blazer" },
  { key: "dressShoe", label: "Tamanho sapato" },
  { key: "cleats", label: "Tamanho chuteira" },
  { key: "sneakers", label: "Tamanho tênis" },
  { key: "flipFlops", label: "Tamanho chinelo" },
] as const;

export const CLOTHING_SIZE_OPTIONS = ["PP", "P", "M", "G", "GG", "XG", "XXG", "34", "36", "38", "40", "42", "44", "46"] as const;
