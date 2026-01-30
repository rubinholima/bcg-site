/**
 * Validação de senha alinhada às regras do Cognito:
 * - mínimo 8 caracteres
 * - pelo menos 1 maiúscula
 * - pelo menos 1 minúscula
 * - pelo menos 1 número
 * - pelo menos 1 caractere especial
 */

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
  unmet?: string[];
}

const MIN_LENGTH = 8;
const HAS_UPPER = /[A-Z]/;
const HAS_LOWER = /[a-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

const REQUIREMENTS = [
  { test: (s: string) => s.length >= MIN_LENGTH, label: "Mínimo 8 caracteres" },
  { test: (s: string) => HAS_UPPER.test(s), label: "Pelo menos 1 letra maiúscula" },
  { test: (s: string) => HAS_LOWER.test(s), label: "Pelo menos 1 letra minúscula" },
  { test: (s: string) => HAS_NUMBER.test(s), label: "Pelo menos 1 número" },
  { test: (s: string) => HAS_SPECIAL.test(s), label: "Pelo menos 1 caractere especial" },
] as const;

export function validateCognitoPassword(password: string): PasswordValidationResult {
  if (!password || password.length === 0) {
    return { valid: false, message: "Informe a nova senha.", unmet: REQUIREMENTS.map((r) => r.label) };
  }
  const unmet = REQUIREMENTS.filter((r) => !r.test(password)).map((r) => r.label);
  if (unmet.length === 0) {
    return { valid: true };
  }
  return {
    valid: false,
    message: "A senha não atende aos requisitos do Cognito.",
    unmet,
  };
}

export function getPasswordRequirementLabels(): string[] {
  return REQUIREMENTS.map((r) => r.label);
}
