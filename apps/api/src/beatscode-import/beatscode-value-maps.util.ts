/** Beatscode → valores canônicos do cadastro BCG (pt-BR). */

import { normalizeHeightCm, normalizeWeightKg } from '../common/body-measures.util';

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

/** Normaliza CPF vindo do Beatscode (pix, campo direto, etc.). */
export function normalizeBeatscodeCpf(raw?: string | null): string | undefined {
  const s = raw?.trim();
  if (!s) return undefined;
  const digits = s.replace(/\D/g, '');
  if (digits.length !== 11) return s;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
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
  return normalizeHeightCm(value) ?? undefined;
}

export function normalizeBeatscodeWeight(value: unknown): number | undefined {
  return normalizeWeightKg(value) ?? undefined;
}

export function resolveBeatscodePlayerStatus(row: Record<string, unknown>): string | undefined {
  if (row.injury === true) return 'injured';
  return undefined;
}
