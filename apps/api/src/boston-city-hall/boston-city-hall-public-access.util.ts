import { createHash, randomBytes } from 'crypto';

export function normalizeBchCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashOpaqueToken(raw: string): string {
  return createHash('sha256').update(raw.trim()).digest('hex');
}

export function generateOpaqueAccessToken(): string {
  return randomBytes(32).toString('base64url');
}

export function readHttpCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader?.trim()) return undefined;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    if (key !== name) continue;
    const raw = trimmed.slice(eq + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return undefined;
}

export function resolveBchPublicAppOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.WEB_PUBLIC_URL?.trim() ||
    process.env.APP_PUBLIC_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return 'http://localhost:3000';
}
