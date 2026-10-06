/** DTO público de fonte de vídeo — nunca expõe storageKey. */
export function mapPublicVideoSource(row: {
  id: string;
  sourceType: string;
  title: string;
  cameraLabel: string | null;
  externalUrl: string | null;
  durationMs: number | null;
  mimeType: string | null;
  width?: number | null;
  height?: number | null;
  processingStatus: string;
  createdAt?: Date;
  storageKey?: string | null;
}) {
  const hasPrivateUpload = Boolean(row.storageKey);
  return {
    id: row.id,
    sourceType: row.sourceType,
    title: row.title,
    cameraLabel: row.cameraLabel,
    externalUrl: row.externalUrl,
    durationMs: row.durationMs,
    mimeType: row.mimeType,
    width: row.width ?? null,
    height: row.height ?? null,
    processingStatus: row.processingStatus,
    createdAt: row.createdAt?.toISOString?.() ?? null,
    hasPrivateUpload,
    streamUrl: hasPrivateUpload ? `/performance-analysis/video-sources/${row.id}/stream` : null,
  };
}
