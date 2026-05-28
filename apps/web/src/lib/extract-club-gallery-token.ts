/** Token da galeria de imprensa do clube — /clube/galeria/{token} */
export function extractClubGalleryToken(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const fromUrl = t.match(/\/clube\/galeria\/([a-f0-9]+)/i);
  if (fromUrl?.[1] && /^[a-f0-9]{32,64}$/i.test(fromUrl[1])) {
    return fromUrl[1].toLowerCase();
  }
  if (/^[a-f0-9]{32,64}$/i.test(t)) return t.toLowerCase();
  return null;
}
