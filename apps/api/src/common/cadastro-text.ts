/**
 * Regra da plataforma: textos de cadastro gravados em MAIÚSCULAS (pt-BR).
 * E-mails: sempre minúsculas (`cadastroEmail`).
 *
 * Não aplicar a: URLs, slugs, IDs externos, enums técnicos, JSON estruturado,
 * campos que o sistema compara com integrações em caixa fixa (ex.: highlights como URL).
 */

import { Prisma } from '@prisma/client';

const CADASTRO_LOCALE = 'pt-BR';

export function cadastroUpper(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  if (!t) return null;
  return t.toLocaleUpperCase(CADASTRO_LOCALE);
}

export function cadastroUpperRequired(value: string): string {
  return value.trim().toLocaleUpperCase(CADASTRO_LOCALE);
}

export function cadastroEmail(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  if (!t) return null;
  return t.toLowerCase();
}

/** Lista de rótulos (ex.: times anteriores). Retorna null se ficar vazia. */
export function cadastroUpperStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out = value
    .filter((x): x is string => typeof x === 'string')
    .map((s) => cadastroUpperRequired(s))
    .filter(Boolean);
  return out.length ? out : null;
}

/** Array JSON só de strings (categorias, tags). */
export function cadastroJsonStringArray(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value == null) return Prisma.JsonNull;
  if (!Array.isArray(value)) return value as Prisma.InputJsonValue;
  const out = value
    .filter((x): x is string => typeof x === 'string')
    .map((s) => cadastroUpperRequired(s))
    .filter(Boolean);
  return out.length ? out : Prisma.JsonNull;
}
