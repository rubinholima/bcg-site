/**
 * Extrai o token da galeria a partir do link completo ou do código colado.
 * Tokens atuais: 32 caracteres hex (16 bytes).
 */
export function extractGalleryToken(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const fromUrl = t.match(/\/eventos\/gallery\/([a-f0-9]+)/i);
  if (fromUrl?.[1] && /^[a-f0-9]{32,64}$/i.test(fromUrl[1])) {
    return fromUrl[1].toLowerCase();
  }
  if (/^[a-f0-9]{32,64}$/i.test(t)) return t.toLowerCase();
  return null;
}
