export function validateSeatAssignment(params: {
  ticketEventId: string;
  tableEventId: string | null | undefined;
  seatEventId: string | null | undefined;
  seatTableId: string | null | undefined;
  targetTableId: string | null | undefined;
}): { ok: true } | { ok: false; reason: string } {
  if (params.targetTableId && params.tableEventId && params.tableEventId !== params.ticketEventId) {
    return { ok: false, reason: 'Mesa pertence a outro evento.' };
  }
  if (params.seatEventId && params.seatEventId !== params.ticketEventId) {
    return { ok: false, reason: 'Assento pertence a outro evento.' };
  }
  if (params.seatTableId && params.targetTableId && params.seatTableId !== params.targetTableId) {
    return { ok: false, reason: 'Assento não pertence à mesa selecionada.' };
  }
  return { ok: true };
}
