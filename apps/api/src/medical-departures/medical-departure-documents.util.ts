export type PlayerRegistrationDocument = {
  id: string;
  name: string;
  documentType: string;
  documentCategory?: string;
  fileKey?: string;
  fileUrl: string;
  uploadedAt?: string;
  source?: string;
};

export function parseRegistrationDocuments(registrationProfile: unknown): PlayerRegistrationDocument[] {
  if (!registrationProfile || typeof registrationProfile !== 'object') return [];
  const docs = (registrationProfile as Record<string, unknown>).documents;
  if (!Array.isArray(docs)) return [];
  return docs.filter(
    (d): d is PlayerRegistrationDocument =>
      !!d &&
      typeof d === 'object' &&
      typeof (d as PlayerRegistrationDocument).id === 'string' &&
      typeof (d as PlayerRegistrationDocument).fileUrl === 'string',
  );
}

export function resolveDepartureDocuments(
  registrationProfile: unknown,
  documentIds: unknown,
): PlayerRegistrationDocument[] {
  const ids = Array.isArray(documentIds)
    ? documentIds.filter((id): id is string => typeof id === 'string')
    : [];
  if (!ids.length) return [];
  const docs = parseRegistrationDocuments(registrationProfile);
  const byId = new Map(docs.map((d) => [d.id, d]));
  return ids.map((id) => byId.get(id)).filter((d): d is PlayerRegistrationDocument => !!d);
}

export function normalizeDocumentIds(documentIds: unknown): string[] {
  if (!Array.isArray(documentIds)) return [];
  return [...new Set(documentIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))];
}
