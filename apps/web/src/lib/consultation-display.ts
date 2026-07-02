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

export function playerPsychologyProfileHref(playerId: string, from?: "consultas"): string {
  const params = new URLSearchParams({ tab: "psicologica" });
  if (from) params.set("from", from);
  return `/dashboard/cadastros/jogadores/${playerId}/edit?${params.toString()}`;
}
