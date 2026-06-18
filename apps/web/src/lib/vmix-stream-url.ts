/** Normaliza URL LiveLAN do vMix para HLS completo (.m3u8). */
export function normalizeVmixStreamUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  if (/\/livelan\/?$/i.test(u)) {
    return `${u.replace(/\/$/, "")}/stream.m3u8`;
  }
  return u;
}
