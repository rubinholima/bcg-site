export type TravelParticipantForRoom = {
  personType: string;
  playerId?: string | null;
  staffId?: string | null;
  logisticsGuestId?: string | null;
  guestName?: string | null;
  player?: { id: string; name: string; category?: string | null } | null;
  staff?: { id: string; name: string; role?: string | null } | null;
  logisticsGuest?: { id: string; name: string } | null;
};

export type TravelRoomParticipantOption = {
  value: string;
  label: string;
  type: 'player' | 'staff' | 'guest';
  id: string;
};

export type RoomOccupantRef = {
  personId?: string;
  personName?: string;
  personType?: string;
};

function guestOptionId(participant: TravelParticipantForRoom): string | null {
  if (participant.logisticsGuestId?.trim()) return participant.logisticsGuestId.trim();
  const name = participant.guestName?.trim() || participant.logisticsGuest?.name?.trim();
  return name || null;
}

export function buildTravelRoomParticipantOptions(
  participants: TravelParticipantForRoom[],
): TravelRoomParticipantOption[] {
  const options: TravelRoomParticipantOption[] = [];

  for (const participant of participants) {
    if (participant.personType === 'player' && participant.playerId) {
      const name = participant.player?.name?.trim();
      if (!name) continue;
      options.push({
        value: `player:${participant.playerId}`,
        label: name,
        type: 'player',
        id: participant.playerId,
      });
      continue;
    }

    if (participant.personType === 'staff' && participant.staffId) {
      const name = participant.staff?.name?.trim();
      if (!name) continue;
      options.push({
        value: `staff:${participant.staffId}`,
        label: name,
        type: 'staff',
        id: participant.staffId,
      });
      continue;
    }

    if (participant.personType === 'guest') {
      const id = guestOptionId(participant);
      const name =
        participant.logisticsGuest?.name?.trim() ||
        participant.guestName?.trim() ||
        null;
      if (!id || !name) continue;
      options.push({
        value: `guest:${id}`,
        label: name,
        type: 'guest',
        id,
      });
    }
  }

  const seen = new Set<string>();
  return options.filter((opt) => {
    if (seen.has(opt.value)) return false;
    seen.add(opt.value);
    return true;
  });
}

/** Preserva ocupantes já gravados no JSON mesmo se saíram da convocação. */
export function mergePreservedRoomOccupantOptions(
  participantOptions: TravelRoomParticipantOption[],
  existingOccupants: RoomOccupantRef[],
): TravelRoomParticipantOption[] {
  const merged = [...participantOptions];
  const seen = new Set(merged.map((o) => o.value));

  for (const occ of existingOccupants) {
    if (!occ.personId && !occ.personName?.trim()) continue;
    const type =
      occ.personType === 'staff'
        ? 'staff'
        : occ.personType === 'guest'
          ? 'guest'
          : 'player';
    const id = occ.personId?.trim() || occ.personName!.trim();
    const value = `${type}:${id}`;
    if (seen.has(value)) continue;
    merged.push({
      value,
      label: occ.personName?.trim() || id,
      type,
      id,
    });
    seen.add(value);
  }

  return merged.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}
