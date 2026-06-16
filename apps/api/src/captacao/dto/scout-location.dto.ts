export class ScoutLocationPingDto {
  latitude!: number;
  longitude!: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  label?: string;
  /** tracking | checkin | report */
  source?: string;
  reportId?: string;
  /** Se true, tenta resolver endereço via OpenStreetMap */
  reverseGeocode?: boolean;
}

export class ScoutTrackingDto {
  active!: boolean;
}
