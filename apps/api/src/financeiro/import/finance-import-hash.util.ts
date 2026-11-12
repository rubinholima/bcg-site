import { createHash } from 'crypto';

export function sha256Buffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

export function rowFingerprint(parts: Record<string, string | number | null | undefined>): string {
  const norm = Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k] ?? ''}`)
    .join('|');
  return createHash('sha256').update(norm).digest('hex');
}
