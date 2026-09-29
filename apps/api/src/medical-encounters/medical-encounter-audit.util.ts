export type MedicalEncounterEditLogEntry = {
  at: string;
  userId?: string | null;
  userName?: string | null;
  action: 'created' | 'updated' | 'evolution';
  comment?: string | null;
};

export function appendMedicalEditLog(
  existing: unknown,
  entry: MedicalEncounterEditLogEntry,
): MedicalEncounterEditLogEntry[] {
  const list = Array.isArray(existing)
    ? [...(existing as MedicalEncounterEditLogEntry[])]
    : [];
  list.push(entry);
  return list.slice(-100);
}
