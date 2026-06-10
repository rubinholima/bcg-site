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
        yield {
          ...pending,
          streamUrl,
          streamUrlHash: hashStreamUrl(streamUrl),
        };
      }
    }
  } finally {
    reader.releaseLock();
  }
}
