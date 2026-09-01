import type { MedicalDepartureStatus } from './medical-departure.constants';

export function inferInitialDepartureStatus(
  departedAt: Date,
  explicit?: string,
): MedicalDepartureStatus {
  if (explicit === 'programada' || explicit === 'em_atendimento') {
    return explicit;
  }
  return departedAt.getTime() > Date.now() ? 'programada' : 'em_atendimento';
}

export function assertDepartureStatusTransition(
  current: MedicalDepartureStatus,
  next: MedicalDepartureStatus,
): void {
  if (current === next) return;
  if (current === 'cancelada' || current === 'retornou') {
    throw new Error('Registro encerrado não pode mudar de status.');
  }
  if (next === 'programada' && current === 'em_atendimento') {
    throw new Error('Não é possível voltar para programada após saída em andamento.');
  }
}

export function normalizeReturnedAtForStatus(
  status: MedicalDepartureStatus,
  returnedAt: Date | null | undefined,
): Date | null {
  if (status === 'retornou') {
    return returnedAt ?? new Date();
  }
  if (status === 'programada' || status === 'em_atendimento' || status === 'cancelada') {
    return null;
  }
  return returnedAt ?? null;
}
