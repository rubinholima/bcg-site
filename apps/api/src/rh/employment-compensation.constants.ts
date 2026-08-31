export const COMPENSATION_KINDS = [
  'TRANSPORT',
  'MEAL',
  'COST_ALLOWANCE',
  'IMAGE_RIGHTS',
] as const;

export type CompensationKind = (typeof COMPENSATION_KINDS)[number];

export const COMPENSATION_KIND_LABELS: Record<CompensationKind, string> = {
  TRANSPORT: 'Vale Transporte',
  MEAL: 'Alimentação',
  COST_ALLOWANCE: 'Ajuda de Custo',
  IMAGE_RIGHTS: 'Direito de Imagem',
};

export function isCompensationKind(value: string): value is CompensationKind {
  return (COMPENSATION_KINDS as readonly string[]).includes(value);
}
