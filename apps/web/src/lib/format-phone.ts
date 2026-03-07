/**
 * Formata número de telefone para exibição (Brasil e EUA).
 * Reconhece pelo número e formata adequadamente.
 */

function onlyDigits(s: string): string {
  return (s ?? "").replace(/\D/g, "");
}

/**
 * Formata para EUA: 10 dígitos → 617.803.6866; 11 dígitos (1 + 10) → 1.617.803.6866
 */
function formatUS(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  // 11 digits: 1 + area + exchange + subscriber
  return `${digits.slice(0, 1)}.${digits.slice(1, 4)}.${digits.slice(4, 7)}.${digits.slice(7, 11)}`;
}

/**
 * Formata para Brasil: (31) 99764-5984 ou 55 31 99764-5984
 * DDD 2 dígitos + 9 + 8 dígitos (celular)
 */
function formatBR(digits: string): string {
  if (digits.length <= 2) return digits;
  // Com código do país 55
  if (digits.startsWith("55") && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length <= 5) return `55 ${ddd} ${rest}`;
    return `55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
  }
  // Sem código do país: 10 dígitos = DDD + 8 (fixo); 11 = DDD + 9 + 8 (celular)
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  // 12+ com 55
  if (digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4, 12);
    return `55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Detecta se é número BR ou US pelos dígitos e formata.
 * - 10 dígitos ou 11 começando com 1 → EUA
 * - 11 dígitos (DDD 2 + 9 + 8), ou 12+ começando com 55 → Brasil
 */
export function formatPhoneForDisplay(value: string | null | undefined): string {
  const digits = onlyDigits(value ?? "");
  if (digits.length === 0) return "";

  const len = digits.length;
  const startsWith1 = digits.startsWith("1");
  const startsWith55 = digits.startsWith("55");

  // EUA: 10 dígitos ou 11 começando com 1
  if (len <= 11 && (len === 10 || (len === 11 && startsWith1))) {
    return formatUS(digits);
  }

  // Brasil: 11 dígitos (DDD + 9 + 8) ou 12+ com 55
  if (startsWith55 && len >= 12) return formatBR(digits);
  if (len === 11 && !startsWith1) return formatBR(digits);
  if (len === 10 && !startsWith1) {
    const ddd = parseInt(digits.slice(0, 2), 10);
    if (ddd >= 11 && ddd <= 99) return formatBR(digits);
    return formatUS(digits);
  }

  if (len >= 12) return formatBR(digits);
  return formatUS(digits);
}

/**
 * Retorna apenas os dígitos (para salvar normalizado).
 */
export function phoneToDigits(value: string | null | undefined): string {
  return onlyDigits(value ?? "");
}
