import { mediaKeyFromStoredUrl } from './media-key.util';

const DEFAULT_ORIGIN = 'https://www.bostoncitygroup.biz';

function mediaOrigin(): string {
  return (
    process.env.PUBLIC_MEDIA_ORIGIN?.trim().replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_MEDIA_ORIGIN?.trim().replace(/\/$/, '') ||
    DEFAULT_ORIGIN
  );
}

/** URL que o browser da Smart TV consegue carregar (CDN / www, não S3 cru). */
export function resolvePublicMediaUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '';
  const t = url.trim();
  if (!t) return '';

  const key = mediaKeyFromStoredUrl(t);
  if (key) {
    return `${mediaOrigin()}/${key}`;
  }

  if (/^https?:\/\//i.test(t)) return t;

  const pathish = t.replace(/^\/+/, '');
  if (pathish.startsWith('logos/') || pathish.startsWith('media/')) {
    return `${mediaOrigin()}/${pathish}`;
  }

  return t;
}

/** HLS (.m3u8) precisa de proxy ou CORS; MPEG-TS (.ts) abre direto no video tag. */
export function isHlsManifestUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return u.includes('.m3u8') || u.includes('type=m3u');
}
