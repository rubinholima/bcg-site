/** IP privado / rede local — stream não pode ser proxied pelo servidor na nuvem. */
export function isPrivateNetworkStreamUrl(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (host.startsWith("10.")) return true;
    if (host.startsWith("192.168.")) return true;
    const m = host.match(/^172\.(\d+)\./);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 16 && n <= 31) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Página LiveLAN do vMix (funciona no browser na mesma rede). */
export function isVmixLiveLanPageUrl(url: string): boolean {
  return /\/livelan\/?$/i.test(url.trim());
}

/** URL da página LiveLAN a partir da página ou do .m3u8. */
export function getVmixLiveLanPageUrl(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  if (isVmixLiveLanPageUrl(u)) return u.replace(/\/$/, "");
  const m = u.match(/^(https?:\/\/[^/]+\/livelan)\/stream\.m3u8/i);
  return m ? m[1] : null;
}

/** HLS do LiveLAN — só para player que suporta .m3u8 na mesma rede. */
export function getVmixLiveLanHlsUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  if (isVmixLiveLanPageUrl(u)) {
    return `${u.replace(/\/$/, "")}/stream.m3u8`;
  }
  return u;
}
