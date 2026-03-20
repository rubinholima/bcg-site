/**
 * Deriva um nome amigável a partir do nome original do arquivo no upload (sem extensão).
 */
export function displayNameFromUploadFilename(
  originalname: string | undefined,
): string | null {
  if (!originalname || typeof originalname !== 'string') return null;
  const last = originalname.trim().split(/[/\\]/).pop() ?? '';
  const withoutExt = last.replace(/\.[^.]+$/, '').trim();
  return withoutExt.length > 0 ? withoutExt : null;
}
