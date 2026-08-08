import { getStaffRoleLabel } from "@/lib/staff-roles";
import {
  DEFAULT_PRESS_KIT_DIRECTOR_ROLES,
  DEFAULT_PRESS_KIT_REFEREE_ROLES,
} from "@/lib/futebol-relatorios.types";

function normRole(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Comissão: técnico → auxiliar → supervisor → analista → goleiros → demais → outros. */
export function pressKitStaffRoleRank(role: string | null | undefined): number {
  const raw = normRole(role);
  const label = normRole(getStaffRoleLabel(role ?? ""));
  const n = `${raw} ${label}`;

  if (
    (n.includes("tecnico") || n.includes("treinador principal") || /\bcoach\b/.test(n)) &&
    !n.includes("auxiliar") &&
    !n.includes("goleiro")
  ) {
    return 0;
  }
  if (n.includes("auxiliar")) return 1;
  if (n.includes("supervisor")) return 2;
  if (n.includes("analista") && (n.includes("desempenho") || n.includes("performance"))) {
    return 3;
  }
  if (n.includes("goleiro")) return 4;
  if (n.includes("preparador") && n.includes("fisic")) return 5;
  if (n.includes("fisiolog")) return 6;
  if (n.includes("medico")) return 7;
  if (n.includes("fisioterapeuta") || n.includes("fisio ")) return 8;
  if (n.includes("massagista")) return 9;
  if (n.includes("enfermeir")) return 10;
  if (n.includes("psicolog")) return 11;
  if (n.includes("nutric")) return 12;
  if (n.includes("scout") || n.includes("olheiro")) return 13;
  if (n.includes("analista")) return 14;
  if (n.includes("outro") || n === "outros") return 98;
  return 80;
}

/** Diretoria: ordem dos cargos do Press Kit (Presidente → Gerente → Gestor → Supervisor…). */
export function pressKitDirectorRoleRank(role: string | null | undefined): number {
  const n = normRole(role);
  const idx = DEFAULT_PRESS_KIT_DIRECTOR_ROLES.findIndex((r) => normRole(r) === n);
  if (idx >= 0) return idx;
  if (n.includes("presidente")) return 0;
  if (n.includes("vice")) return 1;
  if (n.includes("gerente")) return 2;
  if (n.includes("gestor")) return 3;
  if (n.includes("supervisor")) return 4;
  if (n.includes("diretor")) return 5;
  return 50;
}

/** Arbitragem: árbitro → assistentes → quarto. */
export function pressKitRefereeRoleRank(role: string | null | undefined): number {
  const n = normRole(role);
  const idx = DEFAULT_PRESS_KIT_REFEREE_ROLES.findIndex((r) => normRole(r) === n);
  if (idx >= 0) return idx;
  if (n.includes("assistente") && (n.includes("1") || n.includes("um"))) return 1;
  if (n.includes("assistente") && (n.includes("2") || n.includes("dois"))) return 2;
  if (n.includes("quarto")) return 3;
  if (n.includes("assistente")) return 1;
  if (n.includes("arbitro")) return 0;
  return 50;
}

export function sortByPressKitRoleRank<T>(
  items: T[],
  getRole: (item: T) => string | null | undefined,
  rankFn: (role: string | null | undefined) => number,
  getName: (item: T) => string,
): T[] {
  return [...items].sort((a, b) => {
    const d = rankFn(getRole(a)) - rankFn(getRole(b));
    if (d !== 0) return d;
    return getName(a).localeCompare(getName(b), "pt-BR");
  });
}
