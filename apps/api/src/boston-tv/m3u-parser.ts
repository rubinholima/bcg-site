import { createHash } from 'crypto';

export interface ParsedM3uChannel {
  name: string;
  streamUrl: string;
  groupTitle: string | null;
  logoUrl: string | null;
  tvgId: string | null;
  streamUrlHash: string;
}

function hashStreamUrl(url: string): string {
  return createHash('sha256').update(url.trim()).digest('hex');
}

/** Links de site/VOD na M3U — não são transmissão HLS/TS para o player. */
export function isPlayableIptvStreamUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!/^https?:\/\//.test(u)) return false;

  if (/\/livelan\/?$/.test(u) || /\/livelan\/stream\.m3u8/.test(u)) {
    return true;
  }

  const blockedHosts = [
    'primevideo.',
    'amazon.com/gp/video',
    'netflix.com',
    'youtube.com',
    'youtu.be',
    'facebook.com',
    'instagram.com',
    'disneyplus.',
    'disney.',
    'hbomax.',
    'max.com/watch',
    'globoplay.globo.com',
    'starplus.',
  ];
  if (blockedHosts.some((h) => u.includes(h))) return false;

  if (/\/watch\/|\/title\/|\/video\/|\/movies\//.test(u) && !u.includes('.m3u8')) {
    return false;
  }

  return true;
}

export function isPrivateNetworkStreamUrl(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.startsWith('10.')) return true;
    if (host.startsWith('192.168.')) return true;
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

export function isVmixLiveLanPageUrl(url: string): boolean {
  return /\/livelan\/?$/i.test(url.trim());
}

function parseExtinfAttrs(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([\w-]+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function parseExtinfLine(line: string): { name: string; attrs: Record<string, string> } {
  const attrs = parseExtinfAttrs(line);
  const comma = line.lastIndexOf(',');
  const name =
    comma >= 0 ? line.slice(comma + 1).trim() : attrs['tvg-name']?.trim() || 'Canal';
  return { name, attrs };
}

function isStreamLine(line: string): boolean {
  if (!line || line.startsWith('#')) return false;
  return /^https?:\/\//i.test(line) || line.startsWith('rtmp://') || line.startsWith('rtsp://');
}

/** Parser linha a linha — adequado para listas M3U grandes. */
export async function* parseM3uFromResponse(
  response: Response,
): AsyncGenerator<ParsedM3uChannel> {
  if (!response.body) {
    throw new Error('Resposta M3U sem corpo.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let pending: Omit<ParsedM3uChannel, 'streamUrlHash'> | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const raw = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        const line = raw.replace(/\r$/, '').trim();
        if (!line) continue;

        if (line.startsWith('#EXTINF:')) {
          const { name, attrs } = parseExtinfLine(line);
          pending = {
            name: attrs['tvg-name']?.trim() || name,
            streamUrl: '',
            groupTitle: attrs['group-title']?.trim() || null,
            logoUrl: attrs['tvg-logo']?.trim() || null,
            tvgId: attrs['tvg-id']?.trim() || null,
          };
          continue;
        }

        if (pending && isStreamLine(line)) {
          const streamUrl = line.trim();
          if (!isPlayableIptvStreamUrl(streamUrl)) {
            pending = null;
            continue;
          }
          yield {
            ...pending,
            streamUrl,
            streamUrlHash: hashStreamUrl(streamUrl),
          };
          pending = null;
        }
      }
    }

    if (buffer.trim()) {
      const line = buffer.trim();
      if (pending && isStreamLine(line)) {
        const streamUrl = line.trim();
        if (isPlayableIptvStreamUrl(streamUrl)) {
          yield {
            ...pending,
            streamUrl,
            streamUrlHash: hashStreamUrl(streamUrl),
          };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
