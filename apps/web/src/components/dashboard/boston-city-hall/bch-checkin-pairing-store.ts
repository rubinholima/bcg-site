const STORAGE_KEY = "bch-checkin-pairing-v1";

export type BchCheckinPairing = {
  eventId: string;
  stationId: string;
  deviceLabel: string;
  sessionId?: string;
};

type Store = Record<string, BchCheckinPairing>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function readCheckinPairing(eventId: string): BchCheckinPairing | null {
  if (!eventId) return null;
  const hit = readStore()[eventId];
  if (!hit || hit.eventId !== eventId || !hit.stationId) return null;
  return hit;
}

export function saveCheckinPairing(pairing: BchCheckinPairing) {
  const store = readStore();
  store[pairing.eventId] = pairing;
  writeStore(store);
}

export function clearCheckinPairing(eventId: string) {
  const store = readStore();
  delete store[eventId];
  writeStore(store);
}
