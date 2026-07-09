/** Rótulos e helpers para exibir consultas no calendário e fichas. */

export type ConsultationModality = {
  label: string;
  isOnline: boolean;
  toneClass: string;
};

export function getConsultationModality(type?: string, link?: string): ConsultationModality {
  const t = (type ?? "").toLowerCase().trim();
  if (t === "presencial" || t === "atendimento_presencial") {
    return {
      label: "Presencial",
      isOnline: false,
      toneClass: "bg-sky-500/20 text-sky-700 dark:text-sky-300",
    };
  }
  if (t === "grupo" || t === "atendimento_grupo") {
    return {
      label: "Grupo",
      isOnline: false,
      toneClass: "bg-violet-500/20 text-violet-700 dark:text-violet-300",
    };
  }
  if (t === "meet" || t === "online" || Boolean(link?.trim())) {
    return {
      label: "Online",
      isOnline: true,
      toneClass: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    };
  }
  return {
    label: "Presencial",
    isOnline: false,
    toneClass: "bg-sky-500/20 text-sky-700 dark:text-sky-300",
  };
}

export function getConsultationPerformerName(input: {
  psychologist?: string | null;
  estagiario?: string | null;
}): string | undefined {
  const performer = input.estagiario?.trim() || input.psychologist?.trim();
  return performer || undefined;
}

/** Primeiro + último nome para não quebrar layout (ex.: RÍVIA DA SILVA MARTINS → RÍVIA MARTINS). */
export function formatPersonFirstLastName(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function playerPsychologyProfileHref(playerId: string, from?: "consultas"): string {
  const params = new URLSearchParams({ tab: "psicologica" });
  if (from) params.set("from", from);
  return `/dashboard/cadastros/jogadores/${playerId}/edit?${params.toString()}`;
}

/** Data local YYYY-MM-DD (hoje). */
export function consultationTodayKey(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

/**
 * Consulta ainda a efetuar: não realizada, não cancelada, e data >= hoje.
 * Usado no calendário/listagem de Psicologia → Consultas.
 */
export function isUpcomingConsultation(c: {
  date?: string | null;
  status?: string | null;
}): boolean {
  const status = (c.status ?? "scheduled").toLowerCase();
  if (status === "completed" || status === "cancelled") return false;
  const date = (c.date ?? "").trim();
  if (!date) return true;
  return date >= consultationTodayKey();
}
