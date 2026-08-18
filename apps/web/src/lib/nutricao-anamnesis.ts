/**
 * Anamnese nutricional esportiva — campos clínicos e operacionais.
 */

export interface NutritionAnamnesisData {
  objetivoConsulta?: string;
  historicoPatologico?: string;
  historicoFamiliar?: string;
  farmacosRegulares?: string;
  estiloVida?: string;
  sistemaExcretorGastro?: string;
  intoleranciasAlergias?: string;
  observacoesGerais?: string;
  preferenciasAversao?: string;
  rotinaRefeicoes?: string;
  ingestaoHidrica?: string;
  alcoolTabaco?: string;
  historicoDietas?: string;
  queixasDigestivas?: string;
  objetivoNutricional?: string;
  horariosTreinoJogo?: string;
  localRefeicoes?: string;
  suplementacaoAtual?: string;
  pesoObjetivo?: string;
  nutricionista?: string;
}

export type NutritionAnamnesisFieldKey = keyof NutritionAnamnesisData;

export const NUTRITION_ANAMNESIS_SECTIONS: Array<{
  title: string;
  fields: Array<{
    key: NutritionAnamnesisFieldKey;
    label: string;
    placeholder?: string;
    type?: "text" | "textarea";
  }>;
}> = [
  {
    title: "Consulta",
    fields: [
      {
        key: "objetivoConsulta",
        label: "Objetivo da consulta",
        type: "textarea",
        placeholder: "Motivo do atendimento, queixa principal…",
      },
      {
        key: "objetivoNutricional",
        label: "Objetivo nutricional",
        type: "textarea",
        placeholder: "Ganho de massa, redução de gordura, manutenção, performance…",
      },
    ],
  },
  {
    title: "Histórico clínico",
    fields: [
      {
        key: "historicoPatologico",
        label: "Histórico patológico do paciente",
        type: "textarea",
      },
      {
        key: "historicoFamiliar",
        label: "Histórico familiar",
        type: "textarea",
      },
      {
        key: "farmacosRegulares",
        label: "Fármacos usados regularmente",
        type: "textarea",
      },
    ],
  },
  {
    title: "Estilo de vida e hábitos",
    fields: [
      {
        key: "estiloVida",
        label: "Estilo de vida (sono, exercícios, alimentação, suplementação)",
        type: "textarea",
      },
      {
        key: "rotinaRefeicoes",
        label: "Rotina de refeições (horários e locais)",
        type: "textarea",
      },
      {
        key: "ingestaoHidrica",
        label: "Ingestão hídrica diária",
        type: "text",
        placeholder: "Ex.: 2,5 L/dia",
      },
      {
        key: "alcoolTabaco",
        label: "Álcool / tabaco",
        type: "textarea",
      },
      {
        key: "horariosTreinoJogo",
        label: "Horários de treinos e jogos",
        type: "textarea",
      },
      {
        key: "localRefeicoes",
        label: "Onde costuma fazer as refeições",
        type: "textarea",
        placeholder: "CT, hotel, casa, refeitório…",
      },
    ],
  },
  {
    title: "Sistema digestivo e alimentação",
    fields: [
      {
        key: "sistemaExcretorGastro",
        label: "Funcionalidade do sistema excretor e gastrointestinal",
        type: "textarea",
      },
      {
        key: "intoleranciasAlergias",
        label: "Intolerância ou alergias de origem alimentar",
        type: "textarea",
      },
      {
        key: "queixasDigestivas",
        label: "Queixas digestivas atuais",
        type: "textarea",
      },
      {
        key: "preferenciasAversao",
        label: "Preferências alimentares / aversões",
        type: "textarea",
      },
      {
        key: "historicoDietas",
        label: "Histórico de dietas anteriores",
        type: "textarea",
      },
      {
        key: "suplementacaoAtual",
        label: "Suplementação em uso",
        type: "textarea",
      },
    ],
  },
  {
    title: "Antropometria e observações",
    fields: [
      { key: "pesoObjetivo", label: "Peso / composição desejada", type: "text" },
      {
        key: "observacoesGerais",
        label: "Observações gerais",
        type: "textarea",
      },
      { key: "nutricionista", label: "Nutricionista responsável", type: "text" },
    ],
  },
];

export function emptyNutritionAnamnesis(): NutritionAnamnesisData {
  return {};
}

export function nutritionAnamnesisLabel(data: NutritionAnamnesisData): string {
  const obj = data.objetivoConsulta?.trim();
  if (obj) return obj.length > 60 ? `${obj.slice(0, 57)}…` : obj;
  return "Anamnese nutricional";
}
