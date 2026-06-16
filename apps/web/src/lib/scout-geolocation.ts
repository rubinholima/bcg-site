/** Leitura GPS do navegador (celular em campo ou desktop). */
export interface GeoReading {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export function isGeolocationAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export function getCurrentPosition(): Promise<GeoReading> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationAvailable()) {
      reject(new Error('Geolocalização não disponível neste dispositivo.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        });
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Permissão de localização negada. Ative o GPS no celular.'
            : err.code === err.TIMEOUT
              ? 'Tempo esgotado ao obter GPS. Tente novamente ao ar livre.'
              : 'Não foi possível obter a localização.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

export function watchPosition(
  onReading: (reading: GeoReading) => void,
  onError?: (message: string) => void,
): number {
  if (!isGeolocationAvailable()) {
    onError?.('Geolocalização não disponível.');
    return -1;
  }
  return navigator.geolocation.watchPosition(
    (pos) => {
      onReading({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
      });
    },
    (err) => {
      onError?.(
        err.code === err.PERMISSION_DENIED
          ? 'Permissão de localização negada.'
          : 'Erro ao rastrear GPS.',
      );
    },
    { enableHighAccuracy: true, maximumAge: 30_000, timeout: 25_000 },
  );
}

export function clearPositionWatch(watchId: number) {
  if (watchId >= 0 && isGeolocationAvailable()) {
    navigator.geolocation.clearWatch(watchId);
  }
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function minutesSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
}
