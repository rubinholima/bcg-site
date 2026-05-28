import sharp from 'sharp';

/** Largura máxima por pasta — mantém qualidade visual e reduz peso no S3. */
const MAX_WIDTH_BY_SIZE_KEY: Record<string, number> = {
  hero: 1920,
  hero_compact: 1920,
  section_bg: 1920,
  backgrounds: 1920,
  card: 1200,
  patrocinadores: 800,
  galeria_clubes: 1400,
  gallery: 1400,
  cta: 1200,
  jogadores: 1000,
  jogadores_apoio: 1000,
  comissao: 800,
  medico: 800,
  psicologia: 800,
  patrimonio: 1200,
  rh: 800,
  logo: 512,
  document: 1600,
  custom: 1920,
};

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export function extensionForContentType(contentType: string): string {
  return EXT_BY_MIME[contentType.toLowerCase()] ?? 'webp';
}

/**
 * Redimensiona e converte fotos para WebP (PNG se transparência pequena).
 * SVG, GIF e falhas: retorna o original.
 */
export async function optimizeUploadImage(
  buffer: Buffer,
  contentType: string,
  sizeKey?: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const ct = contentType.toLowerCase();
  if (ct === 'image/svg+xml' || ct === 'image/gif' || !ct.startsWith('image/')) {
    return { buffer, contentType };
  }

  const maxW = MAX_WIDTH_BY_SIZE_KEY[(sizeKey ?? 'custom').toLowerCase()] ?? 1920;

  try {
    const base = sharp(buffer, { failOn: 'none' }).rotate();
    const meta = await base.metadata();
    const width = meta.width ?? 0;
    let pipeline = width > maxW ? base.resize({ width: maxW, withoutEnlargement: true }) : base;

    const preservePng = meta.hasAlpha && (sizeKey === 'logo' || (width > 0 && width <= 900));
    if (preservePng) {
      const out = await pipeline.png({ compressionLevel: 9, palette: width <= 512 }).toBuffer();
      return { buffer: out, contentType: 'image/png' };
    }

    const out = await pipeline.webp({ quality: sizeKey === 'logo' ? 88 : 82, effort: 4 }).toBuffer();
    return { buffer: out, contentType: 'image/webp' };
  } catch {
    return { buffer, contentType };
  }
}

export async function optimizeLogoImage(
  buffer: Buffer,
  contentType: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  return optimizeUploadImage(buffer, contentType, 'logo');
}

export async function optimizeDocumentImage(
  buffer: Buffer,
  contentType: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!contentType.toLowerCase().startsWith('image/')) {
    return { buffer, contentType };
  }
  return optimizeUploadImage(buffer, contentType, 'document');
}
