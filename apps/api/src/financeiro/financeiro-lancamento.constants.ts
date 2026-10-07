/** Titularidade da obrigação no Financeiro transversal CUP360. */
export const FINANCEIRO_OWNERSHIP_KINDS = [
  'native',
  'projection',
  'external',
  'adjustment',
] as const;
export type FinanceiroOwnershipKind = (typeof FINANCEIRO_OWNERSHIP_KINDS)[number];

/** Módulo de origem (domínio canônico ou integração). */
export const FINANCEIRO_SOURCE_MODULES = [
  'financeiro',
  'player_negotiations',
  'bch_ticketing',
  'omie',
] as const;
export type FinanceiroSourceModule = (typeof FINANCEIRO_SOURCE_MODULES)[number];

export const FINANCEIRO_SOURCE_TYPES = [
  'manual',
  'installment',
  'titulo',
  'adjustment',
  'event_ticket_order',
] as const;
export type FinanceiroSourceType = (typeof FINANCEIRO_SOURCE_TYPES)[number];

/** ISO 4217 — padrão histórico do módulo Financeiro ADM (clubes BR). */
export const FINANCEIRO_DEFAULT_CURRENCY = 'BRL';
