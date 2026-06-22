/**
 * Anamnese psicológica esportiva — espelha o modelo em PDF (Boston City).
 */

export type PsychEntryKind =
  | "anamnese"
  | "atendimento_grupo"
  | "atendimento_presencial"
  | "relatorio_semanal";

export interface PsychAnamnesisData {
  nomeCompleto?: string;
  comoEstaHoje?: string;
  dataNascimentoIdade?: string;
  escola?: string;
  contato?: string;
  responsavel?: string;
  estruturaFamiliar?: string;
  relacaoTreinadores?: string;
  origemMoradia?: string;
  relacaoColegas?: string;
  relacionamento?: string;
  necessidadesExcepcionais?: string;
  posicao?: string;
  categoria?: string;
  tempoPratica?: string;
  tempoClube?: string;
  torneiosRecentes?: string;
  historicoLesoes?: string;
  objetivoPrincipal?: string;
  alfabetizado?: "sim" | "nao" | "";
  observacaoAprendizagem?: string;
  preparacaoCompeticao?: string;
  ansiedadeNervosismo?: string;
  dificuldadeDormir?: "sim" | "nao" | "";
  acompanhamentoPsicologico?: string;
  escalaConfianca1a5?: string;
  errosCriticas?: string;
  estrategiaMental?: string;
  rotinaEstudos?: string;
  dificuldadesConcentracao?: string;
  motivacaoForaEsporte?: string;
  horasSono?: string;
  tempoTelas?: string;
  ansiedadeTristezaRendimento?: string;
  preocupacaoAlimentacao?: string;
  pensouParar?: string;
  esteveForaCasa?: string;
  pressaoJogo?: string;
  confiancaAposErros?: string;
  valorDependeDesempenho?: string;
  pressaoResultado?: string;
  reacaoAposErros?: string;
  observacaoGeral?: string;
  supervisora?: string;
  crpSupervisora?: string;
  estagiaria?: string;
}

export type PsychAnamnesisFieldKey = keyof PsychAnamnesisData;

export const PSYCH_ANAMNESIS_SECTIONS: Array<{
  title: string;
  fields: Array<{
    key: PsychAnamnesisFieldKey;
    label: string;
    placeholder?: string;
    type?: "text" | "textarea" | "yesno" | "scale";
  }>;
}> = [
  {
    title: "Dados pessoais",
    fields: [
      { key: "nomeCompleto", label: "Nome completo", placeholder: "Nome do atleta" },
      { key: "comoEstaHoje", label: "Como você está hoje?", placeholder: "Ex.: bem, normal, ansioso…" },
      { key: "dataNascimentoIdade", label: "Data de nascimento / Idade", placeholder: "DD/MM/AAAA — idade" },
      { key: "escola", label: "Escola" },
      { key: "contato", label: "Contato (tel/e-mail)" },
      { key: "responsavel", label: "Responsável (se menor de idade)" },
    ],
  },
  {
    title: "Contexto social",
    fields: [
      { key: "estruturaFamiliar", label: "Estrutura familiar", type: "textarea" },
      { key: "relacaoTreinadores", label: "Relação com treinador(es)", type: "textarea" },
      { key: "origemMoradia", label: "Origem / moradia", type: "textarea" },
      { key: "relacaoColegas", label: "Relação com colegas de time ou escola", type: "textarea" },
      { key: "relacionamento", label: "Relacionamento", type: "textarea" },
      { key: "necessidadesExcepcionais", label: "Necessidades excepcionais", type: "textarea" },
    ],
  },
  {
    title: "Informações esportivas",
    fields: [
      { key: "posicao", label: "Posição" },
      { key: "categoria", label: "Categoria" },
      { key: "tempoPratica", label: "Há quanto tempo pratica" },
      { key: "tempoClube", label: "Tempo presente no clube" },
      { key: "torneiosRecentes", label: "Torneios / competições recentes", type: "textarea" },
      { key: "historicoLesoes", label: "Histórico de lesões (tipo, quando, tratamento)", type: "textarea" },
    ],
  },
  {
    title: "Objetivos e motivação",
    fields: [
      {
        key: "objetivoPrincipal",
        label: "Principal objetivo no futebol e por que pratica hoje",
        type: "textarea",
        placeholder: "Ex.: seleção, campeonato, ajudar a família…",
      },
    ],
  },
  {
    title: "Aprendizagem",
    fields: [
      { key: "alfabetizado", label: "Alfabetização", type: "yesno" },
      { key: "observacaoAprendizagem", label: "Observação", type: "textarea" },
    ],
  },
  {
    title: "Aspectos psicológicos",
    fields: [
      { key: "preparacaoCompeticao", label: "Como se sente na preparação para competições?", type: "textarea" },
      { key: "ansiedadeNervosismo", label: "Sente ansiedade ou nervosismo? Em qual momento?", type: "textarea" },
      { key: "dificuldadeDormir", label: "Dificuldade em dormir antes de jogos importantes?", type: "yesno" },
      { key: "acompanhamentoPsicologico", label: "Acompanhamento psicológico anterior", type: "textarea" },
    ],
  },
  {
    title: "Autoconfiança e mentalidade",
    fields: [
      { key: "escalaConfianca1a5", label: "Escala 1–5 — confiança ao competir", type: "scale" },
      { key: "errosCriticas", label: "Como lida com erros ou críticas?", type: "textarea" },
      { key: "estrategiaMental", label: "Estratégia mental / intenção antes de competir", type: "textarea" },
    ],
  },
  {
    title: "Desenvolvimento e bem-estar",
    fields: [
      { key: "rotinaEstudos", label: "Rotina de estudos/trabalho (equilíbrio com esporte)", type: "textarea" },
      { key: "dificuldadesConcentracao", label: "Dificuldades com concentração ou estresse escolar", type: "textarea" },
      { key: "motivacaoForaEsporte", label: "Algo impactando motivação fora do esporte?", type: "textarea" },
      { key: "horasSono", label: "Horas / horário de sono", type: "textarea" },
      { key: "tempoTelas", label: "Tempo de telas em média", type: "textarea" },
    ],
  },
  {
    title: "Saúde mental e comportamentos relacionados ao esporte",
    fields: [
      { key: "ansiedadeTristezaRendimento", label: "Ansiedade ou tristeza intensa ligada ao rendimento?", type: "textarea" },
      { key: "preocupacaoAlimentacao", label: "Preocupação com alimentação ou peso?", type: "textarea" },
      { key: "pensouParar", label: "Já pensou em parar por motivo emocional ou pressão?", type: "textarea" },
      { key: "esteveForaCasa", label: "Já esteve fora de casa? Tempo e como lidou", type: "textarea" },
      { key: "pressaoJogo", label: "Como lida sob pressão no jogo?", type: "textarea" },
      { key: "confiancaAposErros", label: "A confiança muda após erros, críticas ou derrotas?", type: "textarea" },
      { key: "valorDependeDesempenho", label: "O valor como pessoa depende do desempenho?", type: "textarea" },
      { key: "pressaoResultado", label: "A pressão por resultado motiva ou trava?", type: "textarea" },
      { key: "reacaoAposErros", label: "Reação emocional após erros ou derrotas", type: "textarea" },
    ],
  },
  {
    title: "Encerramento",
    fields: [
      { key: "observacaoGeral", label: "Observação geral", type: "textarea" },
      { key: "supervisora", label: "Supervisora (nome)" },
      { key: "crpSupervisora", label: "CRP supervisora" },
      { key: "estagiaria", label: "Estagiária(o)" },
    ],
  },
];

export function emptyPsychAnamnesis(): PsychAnamnesisData {
  return { alfabetizado: "", dificuldadeDormir: "" };
}

export function psychEntryLabel(kind?: string): string {
  switch (kind) {
    case "atendimento_grupo":
      return "Atendimento em grupo";
    case "atendimento_presencial":
      return "Atendimento presencial";
    case "relatorio_semanal":
      return "Relatório semanal";
    default:
      return "Anamnese";
  }
}
