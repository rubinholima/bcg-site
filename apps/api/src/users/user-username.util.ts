import { RUBINHO_EMAIL, RUBINHO_USERNAME } from './user-credentials.constants';

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function normalizeUsernameInput(raw: string): string {
  return raw.trim().toLowerCase();
}

export function slugUsernameFromName(name: string | null | undefined, email: string): string {
  const emailLower = email.trim().toLowerCase();
  if (emailLower === RUBINHO_EMAIL) return RUBINHO_USERNAME;

  const source = (name?.trim() || email.split('@')[0] || 'user').split(/\s+/)[0] ?? 'user';
  const slug = source
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return slug.length >= 3 ? slug : `${slug || 'user'}1`.slice(0, 32);
}

export function assertValidUsername(username: string): void {
  const u = normalizeUsernameInput(username);
  if (!USERNAME_RE.test(u)) {
    throw new Error(
      'Username inválido. Use 3–32 caracteres: letras minúsculas, números, ponto, hífen ou underscore.',
    );
  }
}

export async function ensureUniqueUsername(
  prisma: { user: { findUnique: (args: { where: { username: string } }) => Promise<{ id: string } | null> } },
  base: string,
  excludeUserId?: string,
): Promise<string> {
  const normalized = normalizeUsernameInput(base);
  let candidate = normalized;
  let n = 2;
  while (true) {
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing || existing.id === excludeUserId) return candidate;
    candidate = `${normalized}${n}`;
    n += 1;
  }
}
