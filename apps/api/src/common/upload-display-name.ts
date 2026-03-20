/**
 * Nome amigável a partir do nome original do arquivo no upload (sem extensão, hífens → espaço).
 */
export function displayNameFromUploadFilename(
  originalname?: string | null,
): string | null {
  if (!originalname || typeof originalname !== 'string') return null;
  const base = originalname.replace(/\\/g, '/').split('/').pop() ?? '';
  const withoutExt = base.replace(/\.[^.]+$/i, '').trim();
  if (!withoutExt) return null;
  const human = withoutExt
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return human || null;
}
