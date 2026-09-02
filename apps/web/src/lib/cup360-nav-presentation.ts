/**
 * Arquitetura de APRESENTAÇÃO da sidebar CUP360 v1.
 * Apenas rótulos e agrupamento — destinos via slugs do DASHBOARD_MENU (URLs/RBAC inalterados).
 */
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ClipboardList,
  Gauge,
  LayoutGrid,
  Server,
  Settings,
  Shirt,
  Stethoscope,
} from "lucide-react";

export type Cup360PresentationScreenRef = {
  menuPath: string[];
  /** Rótulo opcional na apresentação (padrão: label do menu). */
  label?: string;
};

export type Cup360PresentationModuleRef = {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Um único nó de menu — folha ou ramo achatado. */
  menuPath?: string[];
  /** Várias folhas explícitas. */
  screens?: Cup360PresentationScreenRef[];
  /** Achatar folhas de vários ramos em telas L3. */
  flattenPaths?: string[][];
};

export type Cup360PresentationAreaRef = {
  id: string;
  label: string;
  icon: LucideIcon;
  modules: Cup360PresentationModuleRef[];
};

export type Cup360PresentationStandaloneRef = {
  id: string;
  label: string;
  icon?: LucideIcon;
  menuPath: string[];
};

/** Item standalone acima das áreas. */
export const CUP360_EXECUTIVE_STANDALONE: Cup360PresentationStandaloneRef = {
  id: "executivo",
  label: "Dashboard Executivo",
  icon: Gauge,
  menuPath: ["futebol", "futebol_executivo"],
};

export const CUP360_PRESENTATION_AREAS: Cup360PresentationAreaRef[] = [
  {
    id: "operacao",
    label: "Operação",
    icon: ClipboardList,
    modules: [
      { id: "agenda", label: "Agenda Geral", menuPath: ["agenda"] },
      {
        id: "requisicoes",
        label: "Requisições",
        screens: [
          { menuPath: ["requisicoes", "requisicoes_compra"] },
          { menuPath: ["requisicoes", "requisicoes_ti"], label: "Atendimento e suporte" },
        ],
      },
      {
        id: "infraestrutura",
        label: "Infraestrutura",
        icon: Server,
        flattenPaths: [["requisicoes", "infraestrutura"]],
      },
    ],
  },
  {
    id: "futebol",
    label: "Futebol",
    icon: Shirt,
    modules: [
      { id: "futebol_visao", label: "Visão Geral", menuPath: ["futebol", "futebol_visao"] },
      { id: "elenco", label: "Elenco", flattenPaths: [["futebol", "futebol_cadastros"]] },
      {
        id: "competicoes",
        label: "Competições",
        screens: [
          { menuPath: ["futebol", "futebol_jogos"] },
          { menuPath: ["futebol", "futebol_agenda"], label: "Agenda Futebol" },
        ],
      },
      {
        id: "treinos",
        label: "Treinos",
        flattenPaths: [
          ["futebol", "futebol_treinadores"],
          ["futebol", "futebol_comissao"],
          ["futebol", "futebol_performance"],
          ["futebol", "futebol_analise_desempenho"],
        ],
      },
      {
        id: "captacao",
        label: "Captação",
        screens: [
          { menuPath: ["futebol", "futebol_captacao"] },
          { menuPath: ["futebol", "futebol_tryouts"], label: "Try-outs" },
        ],
      },
      { id: "avaliacoes", label: "Avaliações", menuPath: ["futebol", "futebol_avaliacoes"] },
      { id: "logistica", label: "Logística", flattenPaths: [["futebol", "futebol_logistica"]] },
      { id: "relatorios", label: "Relatórios", flattenPaths: [["futebol", "futebol_relatorios"]] },
    ],
  },
  {
    id: "saude",
    label: "Saúde",
    icon: Stethoscope,
    modules: [
      { id: "saude_visao", label: "Visão Geral", menuPath: ["saude", "saude_visao"] },
      {
        id: "medico",
        label: "Médico",
        flattenPaths: [
          ["saude", "medico"],
          ["saude", "saude_cadastros"],
        ],
      },
      { id: "fisioterapia", label: "Fisioterapia", flattenPaths: [["saude", "saude_fisioterapia"]] },
      { id: "psicologia", label: "Psicologia", flattenPaths: [["saude", "psicologia"]] },
      {
        id: "nutricao",
        label: "Nutrição",
        screens: [{ menuPath: ["futebol", "futebol_performance", "futebol_nutricionista"] }],
      },
      { id: "enfermaria", label: "Enfermaria", flattenPaths: [["saude", "saude_enfermaria"]] },
      { id: "relatorios", label: "Relatórios", flattenPaths: [["saude", "saude_relatorios"]] },
    ],
  },
  {
    id: "administrativo",
    label: "Administrativo",
    icon: Building2,
    modules: [
      { id: "adm_visao", label: "Visão Geral", menuPath: ["adm", "adm_visao"] },
      { id: "rh", label: "RH", menuPath: ["adm", "adm_rh"] },
      { id: "ti", label: "TI", menuPath: ["adm", "adm_ti"] },
      {
        id: "financeiro",
        label: "Financeiro",
        screens: [
          { menuPath: ["adm", "adm_financeiro"] },
          { menuPath: ["adm", "adm_financeiro_aprovacoes"], label: "Aprovações compras" },
          { menuPath: ["adm", "adm_cadastros", "adm_cad_clientes"], label: "Clientes" },
        ],
      },
      {
        id: "compras",
        label: "Compras",
        screens: [
          { menuPath: ["adm", "adm_compras"] },
          { menuPath: ["adm", "adm_cadastros", "adm_cad_fornecedores"], label: "Fornecedores" },
        ],
      },
      { id: "patrimonio", label: "Patrimônio", menuPath: ["adm", "adm_patrimonio"] },
      { id: "estoque", label: "Estoque", menuPath: ["adm", "adm_estoque"] },
      {
        id: "contratos",
        label: "Contratos",
        screens: [{ menuPath: ["juridico", "juridico_contratos_base"], label: "Contratos base" }],
      },
      { id: "relatorios", label: "Relatórios", flattenPaths: [["adm", "adm_relatorios"]] },
    ],
  },
  {
    id: "outras",
    label: "Outras Áreas",
    icon: LayoutGrid,
    modules: [
      {
        id: "assistencia_social",
        label: "Assistência Social",
        flattenPaths: [["assistencia_social"]],
      },
      { id: "juridico", label: "Jurídico", flattenPaths: [["juridico"]] },
      { id: "eventos", label: "Eventos", flattenPaths: [["eventos"]] },
      { id: "marketing", label: "Marketing", flattenPaths: [["marketing"]] },
      { id: "imprensa", label: "Imprensa", flattenPaths: [["assessoria_imprensa"]] },
      { id: "academias", label: "Academias", flattenPaths: [["academias"]] },
      { id: "socio_torcedor", label: "Sócio Torcedor", flattenPaths: [["socio_torcedor"]] },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    icon: Settings,
    modules: [
      { id: "grupo_master", label: "Grupo Master", flattenPaths: [["grupo_master"]] },
      { id: "comunicacao", label: "Comunicação", flattenPaths: [["comunicacao"]] },
      { id: "ferramentas", label: "Ferramentas", flattenPaths: [["ferramentas"]] },
      { id: "configuracoes", label: "Configurações", flattenPaths: [["configuracoes"]] },
    ],
  },
];
