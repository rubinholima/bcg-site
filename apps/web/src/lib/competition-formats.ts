/**
 * Formatos de disputa em competições de futebol.
 * Usado em eventos com category=football.
 * Todas as opções servem para montar as páginas do evento (landing, tabelas, regras, fases).
 */

export type CompetitionFormatType = "campeonato" | "copa" | "torneio";

/** Configuração de uma fase (Copa/Torneio) */
export interface PhaseConfig {
  numero: number;
  nome: string; // ex: "1ª fase", "Oitavas", "Quartas", "Semifinais", "Final"
  formato: "eliminatoria" | "jogo_unico" | "todos_contra_todos" | "grupos";
  jogoUnico?: boolean; // para eliminatoria: jogo único (sem ida/volta)
  idaVolta?: boolean;
  numAdvance?: number; // quantos avançam (quando grupos)
  descricao?: string; // texto livre: o que acontece nesta fase
}

/** Regras gerais (prorrogação, pênaltis, pontos) */
export interface RegrasGerais {
  pontosVitoria?: number;
  pontosEmpate?: number;
  prorrogacao?: boolean;
  penaltis?: boolean;
  regrasTexto?: string; // regras em texto livre (Markdown aceito)
}

/** Tabela de jogos: estrutura para renderização */
export interface TabelaJogosConfig {
  tipo: "rodadas" | "chaveamento" | "grupos_e_chaveamento";
  numRodadas?: number; // campeonato: turno/returno (1=turno só, 2=turno e returno)
  turnoReturno?: boolean; // campeonato: todos contra todos ida e volta
}

export interface CompetitionFormatBase {
  formatType: CompetitionFormatType;
  clubsCount: number;
  /** Ordem para classificação: fórmula pontos:desc,saldo_gols:desc,... */
  classificacaoOrdem?: string;
  classificacaoOrdemNome?: string; // nome da fórmula (ex: Fórmula CBF)
  regras?: RegrasGerais;
  tabelaJogos?: TabelaJogosConfig;
}

/** Campeonato: pontos corridos, todos contra todos */
export interface CampeonatoFormat extends CompetitionFormatBase {
  formatType: "campeonato";
  turnoReturno?: boolean;
  rebaixamentoCount?: number;
}

/** Copa: eliminatória mata-mata */
export interface CopaFormat extends CompetitionFormatBase {
  formatType: "copa";
  numPhases?: number;
  jogoUnicoFases?: number[];
  finalJogoUnico?: boolean;
  /** Detalhe de cada fase para regras/tabela */
  phases?: PhaseConfig[];
}

/** Torneio: grupos + eliminatória */
export interface TorneioFormat extends CompetitionFormatBase {
  formatType: "torneio";
  faseGrupos?: boolean;
  numGroups?: number;
  clubsPerGroup?: number;
  vagasPorGrupo?: number;
  faseFinalEliminatoria?: boolean;
  /** Ordem de classificação nos grupos */
  classificacaoGrupos?: string;
  classificacaoGruposNome?: string;
  phases?: PhaseConfig[];
}

export type CompetitionFormat = CampeonatoFormat | CopaFormat | TorneioFormat;

export const FORMAT_OPTIONS: { value: CompetitionFormatType; label: string }[] = [
  { value: "campeonato", label: "Campeonato (pontos corridos)" },
  { value: "copa", label: "Copa (eliminatória mata-mata)" },
  { value: "torneio", label: "Torneio (grupos + eliminatória)" },
];

const DEFAULT_CLASSIFICACAO = "pontos:desc,saldo_gols:desc,gols_marcados:desc,vitorias:desc";
const DEFAULT_REGRAS: RegrasGerais = {
  pontosVitoria: 3,
  pontosEmpate: 1,
  prorrogacao: false,
  penaltis: true,
  regrasTexto: "",
};

export function emptyFormat(type: CompetitionFormatType): CompetitionFormat {
  const base: CompetitionFormatBase = {
    formatType: type,
    clubsCount: 8,
    classificacaoOrdem: DEFAULT_CLASSIFICACAO,
    classificacaoOrdemNome: "",
    regras: { ...DEFAULT_REGRAS },
    tabelaJogos: { tipo: "rodadas", numRodadas: 2, turnoReturno: true },
  };
  if (type === "campeonato") {
    return {
      ...base,
      turnoReturno: true,
      rebaixamentoCount: 0,
      tabelaJogos: { tipo: "rodadas", numRodadas: 2, turnoReturno: true },
    };
  }
  if (type === "copa") {
    return {
      ...base,
      numPhases: 5,
      finalJogoUnico: true,
      regras: { ...DEFAULT_REGRAS, prorrogacao: true, penaltis: true },
      phases: [
        { numero: 1, nome: "1ª fase", formato: "eliminatoria", jogoUnico: false },
        { numero: 2, nome: "Oitavas", formato: "eliminatoria", jogoUnico: false },
        { numero: 3, nome: "Quartas", formato: "eliminatoria", jogoUnico: false },
        { numero: 4, nome: "Semifinais", formato: "eliminatoria", jogoUnico: false },
        { numero: 5, nome: "Final", formato: "jogo_unico", jogoUnico: true },
      ],
      tabelaJogos: { tipo: "chaveamento" },
    };
  }
  if (type === "torneio") {
    return {
      ...base,
      faseGrupos: true,
      numGroups: 2,
      clubsPerGroup: 4,
      vagasPorGrupo: 2,
      faseFinalEliminatoria: true,
      classificacaoGrupos: DEFAULT_CLASSIFICACAO,
      classificacaoGruposNome: "",
      phases: [
        { numero: 1, nome: "Fase de grupos", formato: "grupos", numAdvance: 2 },
        { numero: 2, nome: "Quartas", formato: "eliminatoria" },
        { numero: 3, nome: "Semifinais", formato: "eliminatoria" },
        { numero: 4, nome: "Final", formato: "jogo_unico", jogoUnico: true },
      ],
      tabelaJogos: { tipo: "grupos_e_chaveamento" },
    };
  }
  return base;
}
