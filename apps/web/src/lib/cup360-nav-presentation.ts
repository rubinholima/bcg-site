/**
 * CUP360 Sidebar v3 — apresentação de navegação.
 * Rotas/RBAC permanecem no DASHBOARD_MENU; aqui só hierarquia visual e flyout.
 */
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarDays,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Mic2,
  Scale,
  Server,
  Settings,
  Shirt,
  Stethoscope,
  Ticket,
  Trophy,
} from "lucide-react";

export type Cup360PresentationScreenRef = {
  menuPath: string[];
  label?: string;
};

export type Cup360PresentationModuleRef = {
  id: string;
  label: string;
  icon?: LucideIcon;
  menuPath?: string[];
  screens?: Cup360PresentationScreenRef[];
  flattenPaths?: string[][];
  /** Grupos quando o módulo abre contexto no flyout. */
  contextGroups?: Cup360FlyoutGroupRef[];
  /** Colunas no flyout de contexto (Logística etc.). */
  contextColumns?: 1 | 2;
};

export type Cup360FlyoutItemRef =
  | { kind: "screen"; menuPath: string[]; label?: string }
  | { kind: "module"; moduleId: string; label?: string };

export type Cup360FlyoutGroupRef = {
  id: string;
  label: string;
  items: Cup360FlyoutItemRef[];
};

export type Cup360DepartmentRef = {
  id: string;
  label: string;
  icon: LucideIcon;
  subtitle?: string;
  rootGroups: Cup360FlyoutGroupRef[];
  modules: Record<string, Cup360PresentationModuleRef>;
  flyoutColumns?: 1 | 2;
};

export type Cup360PresentationStandaloneRef = {
  id: string;
  label: string;
  tag?: string;
  icon?: LucideIcon;
  menuPath: string[];
};

export const CUP360_EXECUTIVE_STANDALONE: Cup360PresentationStandaloneRef = {
  id: "executivo",
  label: "Dashboard Executivo",
  tag: "EXECUTIVO",
  icon: Gauge,
  menuPath: ["futebol", "futebol_executivo"],
};

export const CUP360_MASTER_STANDALONE: Cup360PresentationStandaloneRef = {
  id: "master",
  label: "Dashboard Master",
  tag: "MASTER",
  icon: LayoutDashboard,
  menuPath: ["dashboard"],
};

/** Módulos compartilhados reutilizados entre departamentos. */
const MOD: Record<string, Cup360PresentationModuleRef> = {
  elenco: {
    id: "elenco",
    label: "Elenco",
    flattenPaths: [["futebol", "futebol_cadastros"]],
  },
  competicoes: {
    id: "competicoes",
    label: "Competições",
    screens: [
      { menuPath: ["futebol", "futebol_jogos"] },
      { menuPath: ["futebol", "futebol_agenda"], label: "Agenda Futebol" },
    ],
  },
  treinos: {
    id: "treinos",
    label: "Treinos",
    flattenPaths: [
      ["futebol", "futebol_treinadores"],
      ["futebol", "futebol_comissao"],
      ["futebol", "futebol_performance"],
      ["futebol", "futebol_analise_desempenho"],
    ],
  },
  captacao: {
    id: "captacao",
    label: "Captação",
    screens: [
      { menuPath: ["futebol", "futebol_captacao"] },
      { menuPath: ["futebol", "futebol_tryouts"], label: "Try-outs" },
    ],
  },
  logistica: {
    id: "logistica",
    label: "Logística",
    flattenPaths: [["futebol", "futebol_logistica"]],
    contextColumns: 2,
    contextGroups: [
      {
        id: "log_operacao",
        label: "OPERAÇÃO",
        items: [
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cad_hub"], label: "Dashboard" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_viagens"], label: "Jogos e viagens" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_convocacao"], label: "Convocação" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_relatorios", "futebol_logistica_rel_layout"], label: "Programação" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_apoio_logistico"], label: "Apoio logístico" },
        ],
      },
      {
        id: "log_cadastros",
        label: "CADASTROS",
        items: [
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_fornecedores"], label: "Fornecedores" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_companhias_transporte"], label: "Transportadoras" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_aeroportos"], label: "Aeroportos" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_destinos"], label: "Destinos" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_servicos_produtos"], label: "Serviços e produtos" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_convidados"], label: "Pessoas autorizadas" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_categorias_despesas"], label: "Categorias de despesas" },
        ],
      },
      {
        id: "log_viagens",
        label: "VIAGENS",
        items: [
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_hoteis"], label: "Hospedagem" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_tipos_visto"], label: "Vistos internacionais" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_programas_fidelidade"], label: "Programas de milhas" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_tipos_pagamento"], label: "Formas de pagamento" },
        ],
      },
      {
        id: "log_material",
        label: "MATERIAL",
        items: [
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_roupas"], label: "Roupas" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_tipos_uniforme"], label: "Uniformes" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_kits_uniforme"], label: "Kits / uniformes" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_cadastros", "futebol_logistica_cad_grupos_roupas"], label: "Grupos de roupa" },
        ],
      },
      {
        id: "log_relatorios",
        label: "RELATÓRIOS",
        items: [
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_relatorios"], label: "Relatórios logística" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_relatorios", "futebol_logistica_rel_passageiros"], label: "Passageiros" },
          { kind: "screen", menuPath: ["futebol", "futebol_logistica", "futebol_logistica_relatorios", "futebol_logistica_rel_hospedes"], label: "Hóspedes" },
        ],
      },
    ],
  },
  logistica_cadastros: {
    id: "logistica_cadastros",
    label: "Cadastros logística",
    flattenPaths: [["futebol", "futebol_logistica", "futebol_logistica_cadastros"]],
  },
  logistica_relatorios: {
    id: "logistica_relatorios",
    label: "Relatórios logística",
    flattenPaths: [["futebol", "futebol_logistica", "futebol_logistica_relatorios"]],
  },
  futebol_relatorios: {
    id: "futebol_relatorios",
    label: "Relatórios",
    flattenPaths: [["futebol", "futebol_relatorios"]],
  },
  analises: {
    id: "analises",
    label: "Análises",
    flattenPaths: [
      ["futebol", "futebol_analise_desempenho"],
      ["futebol", "futebol_analise_desempenho", "futebol_analise_video"],
      ["futebol", "futebol_analise_desempenho", "futebol_metricas_atletas"],
    ],
  },
  requisicoes: {
    id: "requisicoes",
    label: "Requisições",
    screens: [
      { menuPath: ["requisicoes", "requisicoes_compra"] },
      { menuPath: ["requisicoes", "requisicoes_ti"], label: "Atendimento e suporte" },
    ],
  },
  infraestrutura: {
    id: "infraestrutura",
    label: "Infraestrutura",
    icon: Server,
    flattenPaths: [["requisicoes", "infraestrutura"]],
  },
};

export const CUP360_PRIMARY_DEPARTMENTS: Cup360DepartmentRef[] = [
  {
    id: "futebol",
    label: "Futebol",
    icon: Shirt,
    subtitle: "Gestão esportiva e operação",
    flyoutColumns: 2,
    rootGroups: [
      {
        id: "fb_gestao",
        label: "GESTÃO ESPORTIVA",
        items: [
          { kind: "screen", menuPath: ["futebol", "futebol_visao"], label: "Visão Geral" },
          { kind: "module", moduleId: "elenco" },
          { kind: "module", moduleId: "competicoes" },
          { kind: "module", moduleId: "treinos" },
          { kind: "module", moduleId: "captacao" },
          { kind: "screen", menuPath: ["futebol", "futebol_avaliacoes"], label: "Avaliações" },
        ],
      },
      {
        id: "fb_operacao",
        label: "OPERAÇÃO",
        items: [
          { kind: "module", moduleId: "logistica" },
          { kind: "screen", menuPath: ["futebol", "futebol_agenda"], label: "Agenda" },
          { kind: "screen", menuPath: ["futebol", "futebol_jogos"], label: "Jogos" },
        ],
      },
      {
        id: "fb_intel",
        label: "INTELIGÊNCIA",
        items: [
          { kind: "module", moduleId: "analises" },
          { kind: "module", moduleId: "futebol_relatorios" },
        ],
      },
    ],
    modules: {
      elenco: MOD.elenco!,
      competicoes: MOD.competicoes!,
      treinos: MOD.treinos!,
      captacao: MOD.captacao!,
      logistica: MOD.logistica!,
      logistica_cadastros: MOD.logistica_cadastros!,
      logistica_relatorios: MOD.logistica_relatorios!,
      analises: MOD.analises!,
      futebol_relatorios: MOD.futebol_relatorios!,
    },
  },
  {
    id: "saude",
    label: "Saúde",
    icon: Stethoscope,
    subtitle: "Equipe multidisciplinar",
    rootGroups: [
      {
        id: "saude_geral",
        label: "SAÚDE",
        items: [
          { kind: "screen", menuPath: ["saude", "saude_visao"], label: "Visão Geral" },
          { kind: "module", moduleId: "medico" },
          { kind: "module", moduleId: "fisioterapia" },
          { kind: "module", moduleId: "psicologia" },
          { kind: "module", moduleId: "nutricao" },
          { kind: "module", moduleId: "enfermaria" },
          { kind: "module", moduleId: "saude_relatorios" },
        ],
      },
    ],
    modules: {
      medico: {
        id: "medico",
        label: "Médico",
        flattenPaths: [["saude", "medico"], ["saude", "saude_cadastros"]],
      },
      fisioterapia: {
        id: "fisioterapia",
        label: "Fisioterapia",
        flattenPaths: [["saude", "saude_fisioterapia"]],
      },
      psicologia: {
        id: "psicologia",
        label: "Psicologia",
        flattenPaths: [["saude", "psicologia"]],
      },
      nutricao: {
        id: "nutricao",
        label: "Nutrição",
        screens: [{ menuPath: ["futebol", "futebol_performance", "futebol_nutricionista"] }],
      },
      enfermaria: {
        id: "enfermaria",
        label: "Enfermaria",
        flattenPaths: [["saude", "saude_enfermaria"]],
      },
      saude_relatorios: {
        id: "saude_relatorios",
        label: "Relatórios",
        flattenPaths: [["saude", "saude_relatorios"]],
      },
    },
  },
  {
    id: "administrativo",
    label: "Administrativo",
    icon: Building2,
    subtitle: "Financeiro, RH e operação",
    flyoutColumns: 2,
    rootGroups: [
      {
        id: "adm_geral",
        label: "ADMINISTRATIVO",
        items: [
          { kind: "screen", menuPath: ["adm", "adm_visao"], label: "Visão Geral" },
          { kind: "module", moduleId: "rh" },
          { kind: "module", moduleId: "ti" },
          { kind: "module", moduleId: "financeiro" },
          { kind: "module", moduleId: "compras" },
          { kind: "module", moduleId: "patrimonio" },
          { kind: "module", moduleId: "estoque" },
          { kind: "module", moduleId: "adm_relatorios" },
        ],
      },
      {
        id: "adm_operacao",
        label: "OPERAÇÃO CORPORATIVA",
        items: [
          { kind: "screen", menuPath: ["agenda"], label: "Agenda Geral" },
          { kind: "module", moduleId: "requisicoes" },
          { kind: "module", moduleId: "infraestrutura" },
        ],
      },
      {
        id: "adm_contratos",
        label: "CONTRATOS",
        items: [{ kind: "module", moduleId: "contratos" }],
      },
    ],
    modules: {
      rh: { id: "rh", label: "RH", menuPath: ["adm", "adm_rh"] },
      ti: { id: "ti", label: "TI", menuPath: ["adm", "adm_ti"] },
      financeiro: {
        id: "financeiro",
        label: "Financeiro",
        screens: [
          { menuPath: ["adm", "adm_financeiro"] },
          { menuPath: ["adm", "adm_financeiro_aprovacoes"], label: "Aprovações compras" },
          { menuPath: ["adm", "adm_cadastros", "adm_cad_clientes"], label: "Clientes" },
        ],
      },
      compras: {
        id: "compras",
        label: "Compras",
        screens: [
          { menuPath: ["adm", "adm_compras"] },
          { menuPath: ["adm", "adm_cadastros", "adm_cad_fornecedores"], label: "Fornecedores" },
        ],
      },
      patrimonio: { id: "patrimonio", label: "Patrimônio", menuPath: ["adm", "adm_patrimonio"] },
      estoque: { id: "estoque", label: "Estoque", menuPath: ["adm", "adm_estoque"] },
      contratos: {
        id: "contratos",
        label: "Contratos",
        screens: [{ menuPath: ["juridico", "juridico_contratos_base"], label: "Contratos base" }],
      },
      adm_relatorios: {
        id: "adm_relatorios",
        label: "Relatórios",
        flattenPaths: [["adm", "adm_relatorios"]],
      },
      requisicoes: MOD.requisicoes!,
      infraestrutura: MOD.infraestrutura!,
    },
  },
  {
    id: "juridico",
    label: "Jurídico",
    icon: Scale,
    subtitle: "Contratos e compliance",
    rootGroups: [
      {
        id: "jur_geral",
        label: "JURÍDICO",
        items: [{ kind: "module", moduleId: "juridico_all" }],
      },
    ],
    modules: {
      juridico_all: { id: "juridico_all", label: "Jurídico", flattenPaths: [["juridico"]] },
    },
  },
  {
    id: "assistencia_social",
    label: "Assistência Social",
    icon: GraduationCap,
    subtitle: "Escola e pedagogia",
    rootGroups: [
      {
        id: "as_geral",
        label: "ASSISTÊNCIA SOCIAL",
        items: [{ kind: "module", moduleId: "assistencia_all" }],
      },
    ],
    modules: {
      assistencia_all: {
        id: "assistencia_all",
        label: "Assistência Social",
        flattenPaths: [["assistencia_social"]],
      },
    },
  },
  {
    id: "eventos",
    label: "Eventos",
    icon: CalendarDays,
    subtitle: "Eventos e reservas",
    rootGroups: [
      {
        id: "ev_geral",
        label: "EVENTOS",
        items: [{ kind: "module", moduleId: "eventos_all" }],
      },
    ],
    modules: {
      eventos_all: { id: "eventos_all", label: "Eventos", flattenPaths: [["eventos"]] },
    },
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    subtitle: "Comunicação e mídia",
    rootGroups: [
      {
        id: "mkt_geral",
        label: "MARKETING",
        items: [{ kind: "module", moduleId: "marketing_all" }],
      },
    ],
    modules: {
      marketing_all: { id: "marketing_all", label: "Marketing", flattenPaths: [["marketing"]] },
    },
  },
  {
    id: "imprensa",
    label: "Imprensa",
    icon: Mic2,
    subtitle: "Assessoria de imprensa",
    rootGroups: [
      {
        id: "imp_geral",
        label: "IMPRENSA",
        items: [{ kind: "module", moduleId: "imprensa_all" }],
      },
    ],
    modules: {
      imprensa_all: {
        id: "imprensa_all",
        label: "Imprensa",
        flattenPaths: [["assessoria_imprensa"]],
      },
    },
  },
  {
    id: "academias",
    label: "Academias",
    icon: Trophy,
    subtitle: "Gestão e portal",
    rootGroups: [
      {
        id: "acad_geral",
        label: "ACADEMIAS",
        items: [{ kind: "module", moduleId: "academias_all" }],
      },
    ],
    modules: {
      academias_all: { id: "academias_all", label: "Academias", flattenPaths: [["academias"]] },
    },
  },
  {
    id: "socio_torcedor",
    label: "Sócio Torcedor",
    icon: Ticket,
    subtitle: "Planos e sócios",
    rootGroups: [
      {
        id: "socio_geral",
        label: "SÓCIO TORCEDOR",
        items: [{ kind: "module", moduleId: "socio_all" }],
      },
    ],
    modules: {
      socio_all: {
        id: "socio_all",
        label: "Sócio Torcedor",
        flattenPaths: [["socio_torcedor"]],
      },
    },
  },
];

export const CUP360_SYSTEM_DEPARTMENT: Cup360DepartmentRef = {
  id: "sistema",
  label: "Sistema",
  icon: Settings,
  subtitle: "Administração da plataforma",
  rootGroups: [
    {
      id: "sys_geral",
      label: "SISTEMA",
      items: [
        { kind: "module", moduleId: "grupo_master" },
        { kind: "module", moduleId: "comunicacao" },
        { kind: "module", moduleId: "ferramentas" },
        { kind: "module", moduleId: "configuracoes" },
      ],
    },
  ],
  modules: {
    grupo_master: {
      id: "grupo_master",
      label: "Grupo Master",
      flattenPaths: [["grupo_master"]],
    },
    comunicacao: {
      id: "comunicacao",
      label: "Comunicação",
      flattenPaths: [["comunicacao"]],
    },
    ferramentas: {
      id: "ferramentas",
      label: "Ferramentas",
      flattenPaths: [["ferramentas"]],
    },
    configuracoes: {
      id: "configuracoes",
      label: "Configurações",
      flattenPaths: [["configuracoes"]],
    },
  },
};

/** @deprecated v1 — mantido para compatibilidade de imports legados. */
export const CUP360_PRESENTATION_AREAS = CUP360_PRIMARY_DEPARTMENTS;
