import type { BchCheckinSession, BchCheckinStation } from '@prisma/client';

export type CheckinSessionStationDto = {
  id: string;
  name: string;
  location: string | null;
  active: boolean;
};

export type CheckinSessionDto = {
  id: string;
  status: string;
  station: CheckinSessionStationDto;
  stationMissing: boolean;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  openedAt: string;
  deviceLabel: string | null;
};

type SessionWithStation = BchCheckinSession & { station: BchCheckinStation | null };

function fallbackStation(stationId: string): CheckinSessionStationDto {
  return {
    id: stationId,
    name: 'Estação indisponível',
    location: null,
    active: false,
  };
}

export function mapCheckinStation(row: BchCheckinStation): CheckinSessionStationDto {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    active: row.active,
  };
}

export function mapCheckinSession(row: SessionWithStation | null): CheckinSessionDto | null {
  if (!row) return null;
  const stationMissing = !row.station;
  const station = row.station ? mapCheckinStation(row.station) : fallbackStation(row.stationId);
  return {
    id: row.id,
    status: row.status,
    station,
    stationMissing,
    acceptedCount: row.acceptedCount,
    duplicateCount: row.duplicateCount,
    rejectedCount: row.rejectedCount,
    openedAt: row.openedAt.toISOString(),
    deviceLabel: row.deviceLabel,
  };
}

export function checkinStationLabel(station: CheckinSessionStationDto | null | undefined): string {
  if (!station) return 'Estação não informada';
  return [station.name, station.location].filter(Boolean).join(' · ');
}
