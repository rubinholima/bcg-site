export const COMPLIMENTARY_REASONS = [
  'guest',
  'sponsor',
  'staff',
  'artist',
  'partner',
  'press',
  'courtesy',
  'other',
] as const;

export type ComplimentaryReason = (typeof COMPLIMENTARY_REASONS)[number];

export const COMPLIMENTARY_REASON_LABEL: Record<ComplimentaryReason, string> = {
  guest: 'Convidado',
  sponsor: 'Patrocinador',
  staff: 'Staff',
  artist: 'Artista',
  partner: 'Parceiro',
  press: 'Imprensa',
  courtesy: 'Cortesia',
  other: 'Outro',
};

export const COMPLIMENTARY_ADMISSION_STATUSES = ['active', 'cancelled'] as const;
export type ComplimentaryAdmissionStatus = (typeof COMPLIMENTARY_ADMISSION_STATUSES)[number];
