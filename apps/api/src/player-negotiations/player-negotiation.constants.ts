export const NEGOTIATION_TYPES = [
  'transfer_permanent',
  'loan',
  'partial_rights',
  'mixed',
] as const;
export type NegotiationType = (typeof NEGOTIATION_TYPES)[number];

export const NEGOTIATION_STATUSES = [
  'in_progress',
  'agreed',
  'effective',
  'cancelled',
  'expired',
] as const;
export type NegotiationStatus = (typeof NEGOTIATION_STATUSES)[number];

/** Status exibidos na lista principal de atletas negociados */
export const NEGOTIATION_ACTIVE_LIST_STATUSES: NegotiationStatus[] = [
  'in_progress',
  'agreed',
  'effective',
];

export const INSTALLMENT_STATUSES = ['pending', 'paid', 'overdue', 'cancelled'] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];
