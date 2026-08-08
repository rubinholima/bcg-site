import { getServerBackendBaseUrl } from "@/lib/apiProxy";

export interface HallInstallerScreen {
  num: number;
  name: string;
  locationHint: string | null;
}

const INSTALL_SECRET_HEADER = "X-Boston-Tv-Install-Secret";

function hallInstallHeaders(): HeadersInit {
  const secret = process.env.BOSTON_TV_INSTALL_SECRET?.trim();
  if (!secret) return {};
  return { [INSTALL_SECRET_HEADER]: secret };
}

/** Extrai o número da planilha a partir do nome "1 - USA". */
export function parseHallScreenNum(name: string): number | null {
  const m = /^(\d+)\s*-/.exec(name.trim());
  return m ? parseInt(m[1], 10) : null;
}

export async function fetchHallInstallerScreens(): Promise<HallInstallerScreen[]> {
  try {
    const base = getServerBackendBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/public/boston-tv/hall/screens`, {
      cache: "no-store",
      headers: hallInstallHeaders(),
    });
    if (!res.ok) return [];
    return (await res.json()) as HallInstallerScreen[];
  } catch {
    return [];
  }
}

export async function fetchHallPlayerToken(num: number): Promise<string | null> {
  try {
    const base = getServerBackendBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/public/boston-tv/hall/${num}/player-token`, {
      cache: "no-store",
      headers: hallInstallHeaders(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { playerToken?: string };
    return typeof data.playerToken === "string" ? data.playerToken : null;
  } catch {
    return null;
  }
}

export function isHallScreenNum(value: string): value is `${number}` {
  return /^\d+$/.test(value) && parseInt(value, 10) >= 1;
}

export const BOSTON_TV_HALL_SYNC_FOLLOW = "follow_hall";
export const BOSTON_TV_HALL_SYNC_INDEPENDENT = "independent";

export type HallSyncMode =
  | typeof BOSTON_TV_HALL_SYNC_FOLLOW
  | typeof BOSTON_TV_HALL_SYNC_INDEPENDENT;

export function normalizeHallSyncMode(mode: string | undefined | null): HallSyncMode {
  return mode === BOSTON_TV_HALL_SYNC_INDEPENDENT
    ? BOSTON_TV_HALL_SYNC_INDEPENDENT
    : BOSTON_TV_HALL_SYNC_FOLLOW;
}

/** Nome oficial do canal sincronizado do espaço multiuso. */
export const BC_HALL_LABEL = "BC HALL";

/** Rótulo do painel iPad — gerenciamento das telas (menu lateral: Controle Hall). */
export const BC_HALL_CONTROLE_LABEL = "Controle Hall";

export function hallFollowSyncOptionLabel(): string {
  return `Seguir ${BC_HALL_LABEL}`;
}

export function hallSyncModeLabel(mode: string | undefined | null): string {
  return normalizeHallSyncMode(mode) === BOSTON_TV_HALL_SYNC_INDEPENDENT
    ? "Individual"
    : BC_HALL_LABEL;
}

/** "14 - Argentina" → "Argentina" */
export function hallScreenShortLabel(name: string): string {
  const m = /^\d+\s*-\s*(.+)$/.exec(name.trim());
  return m ? m[1].trim() : name.trim();
}

export function formatHallOffsetMs(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
