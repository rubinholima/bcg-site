export type PsychologyPersonType = "player" | "employee" | "staff";
export type PsychologyPersonClassification = "elenco" | "emprestado" | "funcionario";

export type PsychologyCarePerson = {
  personType: PsychologyPersonType;
  personId: string;
  key: string;
  name: string;
  classification: PsychologyPersonClassification;
  classificationLabel: string;
  tenantId: string;
  category?: string | null;
  roleLabel?: string | null;
  photoUrl?: string | null;
  email?: string | null;
};

const CLASSIFICATION_LABEL: Record<PsychologyPersonClassification, string> = {
  elenco: "Elenco",
  emprestado: "Emprestado",
  funcionario: "Funcionário",
};

export function psychologyPersonKey(
  personType: PsychologyPersonType,
  personId: string,
): string {
  return `${personType}:${personId}`;
}

export function parsePsychologyPersonKey(
  key: string,
): { personType: PsychologyPersonType; personId: string } | null {
  const trimmed = key.trim();
  const match = /^(player|employee|staff):(.+)$/.exec(trimmed);
  if (!match) return null;
  return {
    personType: match[1] as PsychologyPersonType,
    personId: match[2]!,
  };
}

export function psychologyClassificationLabel(
  classification: PsychologyPersonClassification,
): string {
  return CLASSIFICATION_LABEL[classification];
}

export function psychologyClassificationBadgeClass(
  classification: PsychologyPersonClassification,
): string {
  if (classification === "emprestado") {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
  if (classification === "funcionario") {
    return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  }
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
}

export function psychologyPersonProfileHref(
  person: Pick<PsychologyCarePerson, "personType" | "personId">,
  from?: "consultas",
): string {
  if (person.personType === "player") {
    const params = new URLSearchParams({ tab: "psicologica" });
    if (from) params.set("from", from);
    return `/dashboard/cadastros/jogadores/${person.personId}/edit?${params.toString()}`;
  }
  if (person.personType === "employee") {
    return `/dashboard/adm/rh?employeeId=${encodeURIComponent(person.personId)}`;
  }
  return `/dashboard/futebol/comissao/${person.personId}/edit`;
}

export function psychologyPersonSelectLabel(person: PsychologyCarePerson): string {
  return `${person.name} · ${person.classificationLabel}`;
}

export async function appendCarePersonOnlineConsultation(
  personKey: string,
  entry: Record<string, unknown>,
): Promise<void> {
  const parsed = parsePsychologyPersonKey(personKey);
  if (!parsed) throw new Error("Pessoa inválida");
  const { api } = await import("@/lib/api");
  const { data } = await api.get<{ onlineConsultations?: unknown[] }>(
    `/psychology-sessions/care-persons/${parsed.personType}/${parsed.personId}/clinical`,
  );
  const current = Array.isArray(data?.onlineConsultations)
    ? (data.onlineConsultations as Array<Record<string, unknown>>)
    : [];
  await api.patch(
    `/psychology-sessions/care-persons/${parsed.personType}/${parsed.personId}/clinical`,
    { onlineConsultations: [...current, entry] },
  );
}

export async function fetchCarePersonClinical(personKey: string): Promise<{
  psychologicalAssessment?: unknown[];
  onlineConsultations?: unknown[];
}> {
  const parsed = parsePsychologyPersonKey(personKey);
  if (!parsed) return {};
  const { api } = await import("@/lib/api");
  const { data } = await api.get<{
    psychologicalAssessment?: unknown[];
    onlineConsultations?: unknown[];
  }>(`/psychology-sessions/care-persons/${parsed.personType}/${parsed.personId}/clinical`);
  return data ?? {};
}

export function carePersonMatchesFilter(
  personKey: string,
  event: { playerId?: string; personKey?: string },
): boolean {
  if (!personKey) return true;
  if (event.personKey) return event.personKey === personKey;
  const parsed = parsePsychologyPersonKey(personKey);
  if (!parsed) return event.playerId === personKey;
  return parsed.personType === "player" && event.playerId === parsed.personId;
}
