import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Labels de departamento para o nome da foto (nome + último nome + departamento) */
export const PHOTO_DEPARTMENT_BY_SIZE_KEY: Record<string, string> = {
  jogadores: "Jogadores",
  comissao: "Comissão técnica",
  medico: "Depto Médico",
  psicologia: "Psicologia",
  rh: "RH",
};

/** Padrão único: nome completo + departamento. Usar em todas as páginas com fotos. */
export function getPhotoDisplayName(name: string, department?: string | null): string {
  const n = (name ?? "").trim();
  const d = (department ?? "").trim();
  return [n, d].filter(Boolean).join(" ");
}

/** @deprecated Use getPhotoDisplayName. Mantido por compatibilidade. */
export function getPlayerPhotoDisplayName(name: string, category?: string | null): string {
  return getPhotoDisplayName(name, category);
}
