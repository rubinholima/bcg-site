/** Beatscode → valores canônicos do cadastro BCG (pt-BR). */

export function mapBeatscodeGenderName(name?: string | null): string | undefined {
  const n = name?.trim().toLowerCase();
  if (!n) return undefined;
  if (n.includes('masc')) return 'masculino';
  if (n.includes('fem')) return 'feminino';
  return undefined;
}

export function mapBeatscodeMaritalName(name?: string | null): string | undefined {
  const n = name?.trim().toLowerCase();
  if (!n) return undefined;
  if (n.includes('solteir')) return 'solteiro';
  if (n.includes('casad')) return 'casado';
  if (n.includes('divorci')) return 'divorciado';
  if (n.includes('viúv') || n.includes('viuv')) return 'viuvo';
  if (n.includes('separad')) return 'divorciado';
  if (n.includes('união') || n.includes('uniao')) return 'uniao_estavel';
  return undefined;
}

export function mapBeatscodeBloodTypeName(name?: string | null): string | undefined {
  const raw = name?.trim().toUpperCase();
  if (!raw) return undefined;
  const map: Record<string, string> = {
    'A+': 'a_pos',
    'A-': 'a_neg',
    'B+': 'b_pos',
    'B-': 'b_neg',
    'AB+': 'ab_pos',
    'AB-': 'ab_neg',
    'O+': 'o_pos',
    'O-': 'o_neg',
  };
  return map[raw];
}

export function mapBeatscodePixKeyType(keyType?: string | null): string | undefined {
  const k = keyType?.trim().toLowerCase();
  if (!k) return undefined;
  if (k === 'cpf') return 'cpf';
  if (k === 'phone' || k === 'telefone') return 'telefone';
  if (k === 'email') return 'email';
  if (k === 'random' || k === 'aleatoria') return 'aleatoria';
  return k;
}

export function normalizeBeatscodeHeight(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n * 100) / 100;
}

export function normalizeBeatscodeWeight(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n * 100) / 100;
}

export function resolveBeatscodePlayerStatus(row: Record<string, unknown>): string | undefined {
  if (row.injury === true) return 'injured';
  return undefined;
}
