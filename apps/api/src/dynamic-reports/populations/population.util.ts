import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
  normalizeSportsSituation,
} from '../../common/sports-situation.util';

export type ParsedRegistrationProfile = {
  personal?: { cpf?: string; rg?: string; nickname?: string };
  sports?: { cbf?: string; jerseyName?: string; situation?: string; documentationApprovedAt?: string };
  extras?: {
    bankName?: string;
    bankAgency?: string;
    bankAccountNumber?: string;
    bankAccountType?: string;
    pixKey?: string;
    pixKeyType?: string;
  };
  loan?: { destinationClub?: string; startDate?: string; endDate?: string };
};

export function parseRegistrationProfile(raw: unknown): ParsedRegistrationProfile {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as ParsedRegistrationProfile;
}

export function cbfFromPlayer(
  cbfRegistration: string | null | undefined,
  profile: ParsedRegistrationProfile,
): string {
  const col = (cbfRegistration ?? '').replace(/\D/g, '');
  if (col) return col;
  return (profile.sports?.cbf ?? '').replace(/\D/g, '');
}

export function hasBidRegistrationEvidence(
  cbfRegistration: string | null | undefined,
  profile: ParsedRegistrationProfile,
): boolean {
  return cbfFromPlayer(cbfRegistration, profile).length > 0;
}

export function hasDocumentationApproved(profile: ParsedRegistrationProfile): boolean {
  return Boolean(profile.sports?.documentationApprovedAt?.trim());
}

/** População BID Boston: ativo + CBF + documentação aprovada — exclui emprestado/desligado/teste */
export function isCurrentBidPlayer(
  registrationProfile: unknown,
  cbfRegistration?: string | null,
): boolean {
  const profile = parseRegistrationProfile(registrationProfile);
  const situation = normalizeSportsSituation(profile.sports?.situation);
  if (situation !== 'ativo') return false;
  if (isArchivedSportsSituation(situation) || isLoanedSportsSituation(situation)) return false;
  if (!hasDocumentationApproved(profile)) return false;
  if (!hasBidRegistrationEvidence(cbfRegistration, profile)) return false;
  return true;
}

export function isLoanedPlayer(registrationProfile: unknown): boolean {
  const profile = parseRegistrationProfile(registrationProfile);
  return isLoanedSportsSituation(profile.sports?.situation);
}

export function isArchivedPlayer(registrationProfile: unknown): boolean {
  const profile = parseRegistrationProfile(registrationProfile);
  return isArchivedSportsSituation(profile.sports?.situation);
}

export function sportsSituationLabel(registrationProfile: unknown): string {
  const profile = parseRegistrationProfile(registrationProfile);
  const situation = normalizeSportsSituation(profile.sports?.situation);
  const labels: Record<string, string> = {
    ativo: 'Ativo',
    emprestado: 'Emprestado',
    teste: 'Teste',
    desligado: 'Desligado',
  };
  return labels[situation] ?? situation;
}

export function calcAgeFromBirthDate(birthDate?: string | null): number | null {
  if (!birthDate?.trim()) return null;
  const d = new Date(`${birthDate.trim().slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export type ActiveEmploymentRow = {
  status: string;
  endDate: Date | null;
  contractType?: string;
  bankData?: unknown;
  department?: { id: string; name: string } | null;
};

/** Vínculo RH ativo: status ativo e sem data de desligamento passada */
export function isActiveEmployment(emp: { status: string; endDate: Date | null }): boolean {
  if (emp.status !== 'ativo') return false;
  if (!emp.endDate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return emp.endDate >= today;
}

export function pickActiveEmployment<T extends ActiveEmploymentRow>(employments: T[]): T | null {
  const active = employments.filter(isActiveEmployment);
  if (active.length === 0) return null;
  return active.sort((a, b) => b.endDate?.getTime() ?? Infinity - (a.endDate?.getTime() ?? Infinity))[0] ?? active[0];
}

export type BankSnapshot = {
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  bankAccountType: string | null;
  bankOperation: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
  bankHolderName: string | null;
  bankHolderCpf: string | null;
};

/**
 * Precedência documentada (determinística, sem sobrescrever silenciosamente):
 * 1) registrationProfile.extras
 * 2) Employment.bankData do vínculo ativo (via RH)
 * 3) Employee.pixKey para PIX se extras vazio
 */
export function resolveBankData(
  profile: ParsedRegistrationProfile,
  employmentBankData: unknown,
  employeePixKey?: string | null,
): BankSnapshot {
  const extras = profile.extras ?? {};
  const fromExtras: BankSnapshot = {
    bankName: extras.bankName?.trim() || null,
    bankAgency: extras.bankAgency?.trim() || null,
    bankAccount: extras.bankAccountNumber?.trim() || null,
    bankAccountType: extras.bankAccountType?.trim() || null,
    bankOperation: null,
    pixKey: extras.pixKey?.trim() || null,
    pixKeyType: extras.pixKeyType?.trim() || null,
    bankHolderName: null,
    bankHolderCpf: null,
  };

  const bankJson =
    employmentBankData && typeof employmentBankData === 'object' && !Array.isArray(employmentBankData)
      ? (employmentBankData as Record<string, unknown>)
      : null;

  const fromEmployment: BankSnapshot = {
    bankName: typeof bankJson?.bank === 'string' ? bankJson.bank.trim() : null,
    bankAgency: typeof bankJson?.agency === 'string' ? bankJson.agency.trim() : null,
    bankAccount: typeof bankJson?.account === 'string' ? bankJson.account.trim() : null,
    bankAccountType: typeof bankJson?.accountType === 'string' ? bankJson.accountType.trim() : null,
    bankOperation: typeof bankJson?.operation === 'string' ? bankJson.operation.trim() : null,
    pixKey: typeof bankJson?.pix === 'string' ? bankJson.pix.trim() : null,
    pixKeyType: typeof bankJson?.pixKeyType === 'string' ? bankJson.pixKeyType.trim() : null,
    bankHolderName: typeof bankJson?.holderName === 'string' ? bankJson.holderName.trim() : null,
    bankHolderCpf: typeof bankJson?.holderCpf === 'string' ? bankJson.holderCpf.replace(/\D/g, '') || null : null,
  };

  return {
    bankName: fromExtras.bankName ?? fromEmployment.bankName,
    bankAgency: fromExtras.bankAgency ?? fromEmployment.bankAgency,
    bankAccount: fromExtras.bankAccount ?? fromEmployment.bankAccount,
    bankAccountType: fromExtras.bankAccountType ?? fromEmployment.bankAccountType,
    bankOperation: fromEmployment.bankOperation,
    pixKey: fromExtras.pixKey ?? fromEmployment.pixKey ?? employeePixKey?.trim() ?? null,
    pixKeyType: fromExtras.pixKeyType ?? fromEmployment.pixKeyType,
    bankHolderName: fromEmployment.bankHolderName,
    bankHolderCpf: fromEmployment.bankHolderCpf,
  };
}
