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
}

export function parseRegistrationProfile(raw: unknown): PlayerRegistrationProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as PlayerRegistrationProfile;
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
  { value: "elenco", label: "Elenco" },
  { value: "emprestado", label: "Emprestado" },
  { value: "teste", label: "Teste" },
  { value: "inativo", label: "Inativo" },
] as const;

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
