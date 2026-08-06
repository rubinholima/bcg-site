/** Mapeamento esquema ↔ posição canônica do cadastro + escalação automática. */

import type { RelatorioPessoaRow } from "@/lib/futebol-relatorios.types";
import {
  getPositionLabel,
  normalizeFootballPositionCode,
  type FootballPositionCode,
} from "@/lib/football-positions";
import { getFormation, type FormationDef, type FormationSlot } from "@/lib/press-kit-formations";

export type FormationSlotWithAccepts = FormationSlot & {
  accepts: FootballPositionCode[];
};

const SLOT_ACCEPTS: Record<string, FootballPositionCode[]> = {
  gk: ["GOLEIRO"],
  lb: ["LATERAL ESQUERDO"],
  rb: ["LATERAL DIREITO"],
  cb1: ["ZAGUEIRO"],
  cb2: ["ZAGUEIRO"],
  cb3: ["ZAGUEIRO"],
  lwb: ["LATERAL ESQUERDO"],
  rwb: ["LATERAL DIREITO"],
  lm: ["MEIO-CAMPO", "EXTREMO", "LATERAL ESQUERDO"],
  rm: ["MEIO-CAMPO", "EXTREMO", "LATERAL DIREITO"],
  cm1: ["VOLANTE", "MEIO-CAMPO"],
  cm2: ["MEIO-CAMPO", "VOLANTE"],
  cm3: ["VOLANTE", "MEIO-CAMPO"],
  cdm1: ["VOLANTE"],
  cdm2: ["VOLANTE"],
  cam: ["MEIO-CAMPO"],
  lam: ["MEIO-CAMPO", "EXTREMO"],
  ram: ["MEIO-CAMPO", "EXTREMO"],
  lw: ["EXTREMO"],
  rw: ["EXTREMO"],
  st: ["CENTROAVANTE", "EXTREMO"],
  st1: ["CENTROAVANTE", "EXTREMO"],
  st2: ["CENTROAVANTE", "EXTREMO"],
};

export function slotsWithAccepts(formation: FormationDef): FormationSlotWithAccepts[] {
  return formation.slots.map((slot) => ({
    ...slot,
    accepts: SLOT_ACCEPTS[slot.id] ?? ["MEIO-CAMPO"],
  }));
}

export function cadastroPositionLabel(position: string | null | undefined): string {
  const code = normalizeFootballPositionCode(position);
  if (code) return getPositionLabel(code) || code;
  return position?.trim() || "—";
}

export function cadastroPositionCode(
  position: string | null | undefined,
): FootballPositionCode | null {
  return normalizeFootballPositionCode(position);
}

/**
 * Coloca atletas nos slots do esquema pela posição do cadastro.
 * `preferredIds` (ex.: última escalação) têm prioridade dentro da mesma posição.
 */
export function assignStartersByCadastroPosition(
  athletes: RelatorioPessoaRow[],
  formationId: string | null | undefined,
  preferredIds: string[] = [],
): string[] {
  const formation = getFormation(formationId);
  const slots = slotsWithAccepts(formation);
  const byId = new Map(
    athletes.filter((a) => a.playerId).map((a) => [a.playerId!, a]),
  );
  const preferredSet = new Set(preferredIds.filter((id) => byId.has(id)));
  const remaining = new Set(
    athletes.map((a) => a.playerId).filter((id): id is string => !!id),
  );

  const pickForSlot = (accepts: FootballPositionCode[]): string | "" => {
    const candidates = [...remaining]
      .map((id) => byId.get(id)!)
      .filter((a) => {
        const code = cadastroPositionCode(a.position);
        return code != null && accepts.includes(code);
      })
      .sort((a, b) => {
        const ap = preferredSet.has(a.playerId!) ? 0 : 1;
        const bp = preferredSet.has(b.playerId!) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        const aj = a.jerseyNumber ?? 999;
        const bj = b.jerseyNumber ?? 999;
        if (aj !== bj) return aj - bj;
        return a.name.localeCompare(b.name, "pt-BR");
      });
    const chosen = candidates[0];
    if (!chosen?.playerId) return "";
    remaining.delete(chosen.playerId);
    return chosen.playerId;
  };

  const result = slots.map((slot) => pickForSlot(slot.accepts));

  // Preenche buracos com preferidos restantes, depois qualquer um
  const fillOrder = [
    ...preferredIds.filter((id) => remaining.has(id)),
    ...[...remaining],
  ];
  let fi = 0;
  for (let i = 0; i < result.length; i++) {
    if (result[i]) continue;
    while (fi < fillOrder.length && !remaining.has(fillOrder[fi]!)) fi++;
    const id = fillOrder[fi++];
    if (!id) break;
    remaining.delete(id);
    result[i] = id;
  }

  return Array.from({ length: 11 }, (_, i) => result[i] ?? "");
}

/** Camisa: override → cadastro → número de ordem provisório. */
export function provisionalJerseyValue(
  athlete: RelatorioPessoaRow,
  overrides: Record<string, number | null>,
  orderNum: number,
): string {
  if (athlete.playerId && athlete.playerId in overrides) {
    const v = overrides[athlete.playerId];
    return v == null ? "" : String(v);
  }
  if (athlete.jerseyNumber != null) return String(athlete.jerseyNumber);
  return String(orderNum);
}

/** Semear overrides só onde não há camisa no cadastro (ordem 1..n). */
export function seedProvisionalJerseyOverrides(
  orderedPlayerIds: string[],
  athletes: RelatorioPessoaRow[],
  existing: Record<string, number | null>,
): Record<string, number | null> {
  const byId = new Map(
    athletes.filter((a) => a.playerId).map((a) => [a.playerId!, a]),
  );
  const next = { ...existing };
  let ord = 0;
  for (const id of orderedPlayerIds) {
    if (!id) continue;
    ord += 1;
    const a = byId.get(id);
    if (!a) continue;
    if (a.jerseyNumber != null) continue;
    if (id in next) continue;
    next[id] = ord;
  }
  return next;
}
