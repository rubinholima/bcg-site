export type CheckinStationDto = {
  id: string;
  name: string;
  location: string | null;
  active: boolean;
};

export type CheckinSessionDto = {
  id: string;
  status: string;
  station?: CheckinStationDto | null;
  stationMissing?: boolean;
  acceptedCount?: number;
  duplicateCount?: number;
  rejectedCount?: number;
  openedAt?: string;
  deviceLabel?: string | null;
};

const FALLBACK_STATION: CheckinStationDto = {
  id: "unknown",
  name: "Estação indisponível",
  location: null,
  active: false,
};

/** Garante contrato estável mesmo com respostas parciais ou legadas. */
export function normalizeCheckinSession(raw: CheckinSessionDto | null | undefined): CheckinSessionDto | null {
  if (!raw?.id) return null;
  const station =
    raw.station && raw.station.name
      ? raw.station
      : { ...FALLBACK_STATION, id: raw.station?.id ?? FALLBACK_STATION.id };
  return {
    ...raw,
    station,
    stationMissing: raw.stationMissing ?? !raw.station?.name,
    acceptedCount: raw.acceptedCount ?? 0,
    duplicateCount: raw.duplicateCount ?? 0,
    rejectedCount: raw.rejectedCount ?? 0,
  };
}

export function checkinStationDisplay(station: CheckinStationDto | null | undefined): string {
  if (!station?.name) return "Estação não informada";
  return station.location ? `${station.name} · ${station.location}` : station.name;
}
