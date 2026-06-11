import { getServerBackendBaseUrl } from "@/lib/apiProxy";

export interface HallInstallerScreen {
  num: number;
  name: string;
  locationHint: string | null;
}

/** Extrai o número da planilha a partir do nome "1 - USA". */
export function parseHallScreenNum(name: string): number | null {
  const m = /^(\d+)\s*-/.exec(name.trim());
  return m ? parseInt(m[1], 10) : null;
}

export async function fetchHallInstallerScreens(): Promise<HallInstallerScreen[]> {
  try {
    const base = getServerBackendBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/public/boston-tv/hall/screens`, { cache: "no-store" });
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
