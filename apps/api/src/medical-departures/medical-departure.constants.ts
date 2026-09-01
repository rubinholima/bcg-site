export const MEDICAL_DEPARTURE_CARE_TYPES = [
  'medico',
  'dentista',
  'exames',
  'pronto_atendimento',
  'emergencia',
  'cirurgia',
  'outro',
] as const;

export const MEDICAL_DEPARTURE_TRANSPORT_MODES = [
  'proprio',
  'onibus',
  'aplicativo',
  'taxi',
  'ambulancia_clube',
  'carro_clube',
  'outro',
] as const;

export const MEDICAL_DEPARTURE_STATUSES = [
  'programada',
  'em_atendimento',
  'retornou',
  'cancelada',
] as const;

export type MedicalDepartureCareType = (typeof MEDICAL_DEPARTURE_CARE_TYPES)[number];
export type MedicalDepartureTransportMode = (typeof MEDICAL_DEPARTURE_TRANSPORT_MODES)[number];
export type MedicalDepartureStatus = (typeof MEDICAL_DEPARTURE_STATUSES)[number];
