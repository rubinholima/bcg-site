export const PHYSIO_GAME_PHASE_LABEL: Record<string, string> = {
  concentracao: "Concentração",
  pre_jogo: "Pré-jogo",
  primeiro_tempo: "1º tempo",
  intervalo: "Intervalo",
  segundo_tempo: "2º tempo",
  pos_jogo: "Pós-jogo",
};

export const PHYSIO_GAME_CARE_CATEGORY_LABEL: Record<string, string> = {
  tratamento: "Tratamento",
  preparo_preventivo: "Preparo preventivo",
};

export const PHYSIO_GAME_PROCEDURE_LABEL: Record<string, string> = {
  botinha: "Botinha",
  bandagem_elastica: "Bandagem elástica",
  bandagem_estabilizacao: "Bandagem de estabilização",
  taping: "Taping",
  vendagem_funcional: "Vendagem funcional",
  crioterapia: "Crioterapia",
  compressa_gelada: "Compressa gelada",
  aquecimento_local: "Aquecimento local",
  mobilizacao: "Mobilização",
  alongamento: "Alongamento",
  massagem: "Massagem",
  liberacao_miofascial: "Liberação miofascial",
  eletroterapia: "Eletroterapia",
  exercicio_terapeutico: "Exercício terapêutico",
  drenagem: "Drenagem",
  ventosa: "Ventosa",
  outro: "Outro",
};

export const PHYSIO_GAME_TREATMENT_REASON_LABEL: Record<string, string> = {
  estabilizar: "Estabilizar",
  proteger: "Proteger",
  reforcar_musculatura: "Reforçar musculatura",
  limitar_movimento: "Limitar movimento",
};

export const PHYSIO_GAME_BODY_LOCATION_LABEL: Record<string, string> = {
  tornozelo: "Tornozelo",
  joelho: "Joelho",
  adutor: "Adutor",
  quadril: "Quadril",
  panturrilha: "Panturrilha",
  quadriceps: "Quadríceps",
  isquiotibiais: "Isquiotibiais",
  ombro: "Ombro",
  punho: "Punho",
  pe: "Pé",
  lombar: "Lombar",
  cervical: "Cervical",
  outro: "Outro",
};

export const PHYSIO_EVAL_CONTEXT_LABEL: Record<string, string> = {
  pre_temporada: "Pré-temporada",
  inter_temporada: "Inter-temporada",
  pos_temporada: "Pós-temporada",
  desligamento: "Desligamento",
};

export const PHYSIO_EVAL_TEST_TYPE_LABEL: Record<string, string> = {
  forca: "Força",
  mobilidade: "Mobilidade",
  flexibilidade: "Flexibilidade",
  equilibrio: "Equilíbrio",
  salto: "Salto",
  resistencia: "Resistência",
  outro: "Outro",
};

export const PHYSIO_EVAL_BODY_LOCATION_LABEL: Record<string, string> = {
  quadriceps: "Quadríceps",
  isquiotibiais: "Isquiotibiais",
  adutor: "Adutor",
  panturrilha: "Panturrilha",
  tornozelo: "Tornozelo",
  joelho: "Joelho",
  quadril: "Quadril",
  outro: "Outro",
};

export const PHYSIO_EVAL_OUTCOME_LABEL: Record<string, string> = {
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

export function labelFromMap(map: Record<string, string>, key: string, custom?: string | null) {
  if (key === "outro" && custom?.trim()) return custom.trim();
  return map[key] ?? custom ?? key;
}

export function formatGameProcedureList(
  items: Array<{ procedureKey: string; procedureLabel?: string | null }>,
  map: Record<string, string> = PHYSIO_GAME_PROCEDURE_LABEL,
) {
  return items
    .map((item) => labelFromMap(map, item.procedureKey, item.procedureLabel))
    .join(" · ");
}

export function formatGameBodyLocationList(
  items: Array<{ bodyLocation: string; bodyLocationLabel?: string | null }>,
  map: Record<string, string> = PHYSIO_GAME_BODY_LOCATION_LABEL,
) {
  return items
    .map((item) => labelFromMap(map, item.bodyLocation, item.bodyLocationLabel))
    .join(" · ");
}
