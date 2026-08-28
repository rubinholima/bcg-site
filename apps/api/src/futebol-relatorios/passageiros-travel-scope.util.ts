/** Sem convocação nem quartos preenchidos: não usar elenco do clube como fallback. */
export function passageirosFromTravelScope(input: {
  participantCount: number;
  roomPlayerCount: number;
  roomStaffCount: number;
}): 'convocation' | 'rooms' | 'empty' {
  if (input.participantCount > 0) return 'convocation';
  if (input.roomPlayerCount > 0 || input.roomStaffCount > 0) return 'rooms';
  return 'empty';
}
