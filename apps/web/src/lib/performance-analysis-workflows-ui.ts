/** Rótulos espelhados da API — somente UI. */
export const PRE_MATCH_EDITOR_SECTIONS = [
  { key: "jogo", label: "Jogo" },
  { key: "adversario", label: "Adversário" },
  { key: "formacao_provavel", label: "Formação provável" },
  { key: "jogadores_chave", label: "Jogadores-chave" },
  { key: "organizacao_ofensiva", label: "Organização ofensiva" },
  { key: "organizacao_defensiva", label: "Organização defensiva" },
  { key: "transicoes", label: "Transições" },
  { key: "pressao", label: "Pressão" },
  { key: "bolas_paradas", label: "Bolas paradas" },
  { key: "pontos_fortes", label: "Pontos fortes" },
  { key: "pontos_fracos", label: "Pontos fracos" },
  { key: "clips_selecionados", label: "Clips selecionados" },
  { key: "plano_comissao", label: "Plano / observações da comissão" },
] as const;

export const OPPONENT_TACTICAL_SECTIONS = [
  { key: "preferredFormations", label: "Formações" },
  { key: "buildUpPatterns", label: "Saída de bola" },
  { key: "attackingPatterns", label: "Organização ofensiva" },
  { key: "defensiveOrganization", label: "Organização defensiva" },
  { key: "transitionsOff", label: "Transição ofensiva" },
  { key: "transitionsDef", label: "Transição defensiva" },
  { key: "pressingBehavior", label: "Pressão" },
  { key: "setPiecesSummary", label: "Bolas paradas (resumo)" },
  { key: "strengths", label: "Pontos fortes" },
  { key: "weaknesses", label: "Pontos fracos" },
  { key: "keyObservations", label: "Observações" },
] as const;

export const OPPONENT_CLIP_GROUPS = [
  { key: "SAIDA_BOLA", label: "Saída de bola" },
  { key: "ORG_OFENSIVA", label: "Organização ofensiva" },
  { key: "ORG_DEFENSIVA", label: "Organização defensiva" },
  { key: "TRANSICOES", label: "Transições" },
  { key: "PRESSAO", label: "Pressão" },
  { key: "BOLAS_PARADAS", label: "Bolas paradas" },
  { key: "PONTOS_FORTES", label: "Pontos fortes" },
  { key: "PONTOS_FRACOS", label: "Pontos fracos" },
] as const;

export const OPPONENT_SET_PIECE_KINDS = [
  { key: "attacking_corner", label: "Escanteio ofensivo" },
  { key: "defensive_corner", label: "Escanteio defensivo" },
  { key: "attacking_free_kick", label: "Falta ofensiva" },
  { key: "defensive_free_kick", label: "Falta defensiva" },
  { key: "throw_in", label: "Arremesso lateral" },
  { key: "penalty", label: "Pênalti" },
] as const;

export function readProfileJsonText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join("\n");
  if (typeof value === "object" && value !== null && "text" in value) {
    return String((value as { text?: string }).text ?? "");
  }
  return "";
}

export function writeProfileJsonText(text: string): { text: string } {
  return { text: text.trim() };
}

/** Transições no schema é um único Json — UI separa ofensiva/defensiva em chaves virtuais. */
export function readTransitionsSplit(transitions: unknown): { off: string; def: string } {
  if (transitions && typeof transitions === "object" && !Array.isArray(transitions)) {
    const o = transitions as { offensive?: unknown; defensive?: unknown; text?: unknown };
    if ("offensive" in o || "defensive" in o) {
      return {
        off: readProfileJsonText(o.offensive),
        def: readProfileJsonText(o.defensive),
      };
    }
  }
  const all = readProfileJsonText(transitions);
  return { off: all, def: "" };
}

export function selectPreMatchPresentationVersion<
  T extends { id: string; lifecycle: string; versionNumber: number },
>(versions: T[]): T | null {
  if (!versions.length) return null;
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  return (
    sorted.find((v) => v.lifecycle === "PRESENTED") ??
    sorted.find((v) => v.lifecycle === "APPROVED") ??
    sorted[0]
  );
}

export function writeTransitionsSplit(off: string, def: string): { offensive: { text: string }; defensive: { text: string } } {
  return {
    offensive: writeProfileJsonText(off),
    defensive: writeProfileJsonText(def),
  };
}
