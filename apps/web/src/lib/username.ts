/**
 * Gera sugestão de username a partir do primeiro nome (minúsculas, sem acento).
 */
export function suggestUsernameFromName(name: string, email = ""): string {
  const source = (name.trim() || email.split("@")[0] || "user").split(/\s+/)[0] ?? "user";
  const slug = source
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (slug.length >= 3) return slug.slice(0, 32);
  return `${slug || "user"}1`.slice(0, 32);
}

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value.trim().toLowerCase());
}
