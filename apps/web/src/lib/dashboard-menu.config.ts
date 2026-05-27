/**
 * Fonte de verdade do menu do dashboard.
 * Menus, submenus e abas dos jogadores — ao adicionar itens aqui,
 * eles aparecem automaticamente na sidebar e em Configurações → Módulos.
 *
 * Operação: demais grupos — movimentações e telas do dia a dia (URLs inalteradas).
 * Cadastros MDM ficam dentro de cada departamento (Futebol, Saúde, Sócio Torcedor, etc.).
 *
 * REGRA Acessos: todo item com href aqui (e PLAYER_TABS) deve aparecer em Configurações → Acessos
 * via getMenuAccessTree() + sync automático ao abrir a tela (buildModuleCatalog).
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Globe,
  FileText,
  Image,
  Settings,
  Newspaper,
  Tag,
  Users,
  Mail,
  KeyRound,
  Trophy,
  MapPin,
  Shirt,
  Layers,
  UserCircle,
  Building2,
  BarChart3,
  Wrench,
  Stethoscope,
  Brain,
  Star,
  Activity,
  Map as MapIcon,
  Youtube,
  ImageIcon,
  Scale,
  CheckCircle,
  ClipboardList,
  DollarSign,
  ShoppingCart,
  Package,
  Heart,
  Ticket,
  Megaphone,
  UtensilsCrossed,
  Warehouse,
  Calendar,
  Tv,
  Database,
  GraduationCap,
  Archive,
  Monitor,
  Sliders,
  Link2,
  Truck,
} from "lucide-react";
import { DASHBOARD_LABELS } from "./dashboard-labels";

/** Relatórios por hub — query `hub` filtra na página de relatórios. */
export function hubRelatorio(hub: string): MenuItemConfig {
  return {
    slug: `rel_${hub}`,
    label: "Relatórios",
    href: `/dashboard/relatorios?hub=${hub}`,
    icon: BarChart3,
    moduleSlug: "relatorios",
  };
}

export interface MenuItemConfig {
  slug: string;
  label: string;
  href?: string;
  icon?: LucideIcon;
  moduleSlug: string;
  children?: MenuItemConfig[];
  external?: boolean;
  /** Agrupa visualmente com itens consecutivos (menos espaço entre eles) */
  compactGroup?: string;
}

export interface PlayerTabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  moduleSlug: string | null;
}

/** Abas do formulário de jogador. Avaliação psicológica e Análise de desempenho exigem módulo. */
export const PLAYER_TABS: PlayerTabConfig[] = [
  { id: "dados", label: "Dados base", icon: UserCircle, moduleSlug: null },
  { id: "psicologica", label: "Avaliação psicológica", icon: Brain, moduleSlug: "saude" },
  { id: "status", label: "Status", icon: Activity, moduleSlug: "diretoria" },
  { id: "mapa", label: "Mapa / Posição", icon: MapIcon, moduleSlug: null },
  { id: "momentos", label: "Melhores momentos", icon: Youtube, moduleSlug: null },
  { id: "imagens", label: "Imagens", icon: ImageIcon, moduleSlug: null },
  { id: "desempenho", label: "Análise de desempenho", icon: BarChart3, moduleSlug: "futebol_analise" },
];

/** Estrutura completa do menu do dashboard. */
export const DASHBOARD_MENU: MenuItemConfig[] = [
  {
    slug: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    moduleSlug: "dashboard",
  },
  {
    slug: "grupo_master",
    label: "Grupo Master",
    icon: Globe,
    moduleSlug: "grupo_master",
    children: [
      {
        slug: "grupo_config",
        label: "Configuração do grupo",
        href: "/dashboard/grupo",
        icon: Globe,
        moduleSlug: "grupo_master",
      },
      {
        slug: "diretoria_dashboard",
        label: "Diretoria",
        href: "/dashboard/diretoria",
        icon: BarChart3,
        moduleSlug: "diretoria",
      },
      {
        slug: "diretoria_aprovacoes_compras",
        label: "Aprovações compras",
        href: "/dashboard/diretoria/aprovacoes-compras",
        icon: CheckCircle,
        moduleSlug: "diretoria",
      },
      {
        slug: "grupo_empresas",
        label: "Empresas / clubes",
        href: "/dashboard/empresas",
        icon: Building2,
        moduleSlug: "empresas",
      },
      {
        slug: "grupo_tipos",
        label: "Tipos de negócio",
        href: "/dashboard/cadastros/tipos",
        icon: Tag,
        moduleSlug: "tipos",
      },
      {
        slug: "grupo_usuarios",
        label: DASHBOARD_LABELS.usuarios,
        href: "/dashboard/usuarios",
        icon: Users,
        moduleSlug: "usuarios",
      },
      hubRelatorio("grupo_master"),
    ],
  },
  {
    slug: "requisicoes",
    label: "Requisições",
    icon: ClipboardList,
    moduleSlug: "requisicoes",
    children: [
      {
        slug: "requisicoes_compra",
        label: "Requisição de compra",
        href: "/dashboard/requisicoes",
        icon: ShoppingCart,
        moduleSlug: "requisicoes",
      },
      {
        slug: "requisicoes_ti",
        label: "Atendimento e suporte",
        href: "/dashboard/requisicoes/ti",
        icon: Monitor,
        moduleSlug: "requisicoes",
      },
    ],
  },
  {
    slug: "adm",
    label: "Depto Adm",
    icon: Building2,
    moduleSlug: "adm_financeiro",
    children: [
      {
        slug: "adm_visao",
        label: "Visão geral",
        href: "/dashboard/adm",
        icon: LayoutDashboard,
        moduleSlug: "adm_financeiro",
      },
      { slug: "adm_financeiro", label: "Financeiro", href: "/dashboard/adm/financeiro", icon: DollarSign, moduleSlug: "adm_financeiro", compactGroup: "omie" },
      { slug: "adm_clientes", label: "Clientes", href: "/dashboard/adm/clientes", icon: Users, moduleSlug: "adm_financeiro", compactGroup: "omie" },
      { slug: "adm_financeiro_aprovacoes", label: "Aprovações compras", href: "/dashboard/adm/financeiro/aprovacoes", icon: CheckCircle, moduleSlug: "adm_financeiro" },
      { slug: "adm_compras", label: "Compras", href: "/dashboard/adm/compras", icon: ShoppingCart, moduleSlug: "adm_compras", compactGroup: "omie" },
      { slug: "adm_fornecedores", label: "Fornecedores", href: "/dashboard/adm/fornecedores", icon: Truck, moduleSlug: "adm_financeiro", compactGroup: "omie" },
      { slug: "adm_ti", label: "TI — Atendimento", href: "/dashboard/adm/ti", icon: Monitor, moduleSlug: "adm_ti" },
      { slug: "adm_estoque", label: "Estoque", href: "/dashboard/adm/estoque", icon: Package, moduleSlug: "adm_estoque", compactGroup: "omie" },
      { slug: "adm_rh", label: "RH", href: "/dashboard/adm/rh", icon: Users, moduleSlug: "adm_rh" },
      { slug: "adm_patrimonio", label: "Patrimônio", href: "/dashboard/adm/patrimonio", icon: Warehouse, moduleSlug: "adm_patrimonio" },
      hubRelatorio("adm"),
    ],
  },
  {
    slug: "saude",
    label: "Depto de Saúde",
    icon: Stethoscope,
    moduleSlug: "saude",
    children: [
      {
        slug: "saude_visao",
        label: "Visão geral",
        href: "/dashboard/saude",
        icon: LayoutDashboard,
        moduleSlug: "saude",
      },
      {
        slug: "medico",
        label: "Médico",
        icon: Stethoscope,
        moduleSlug: "saude",
        children: [
          {
            slug: "medico_historico",
            label: "Histórico médico",
            href: "/dashboard/medico",
            icon: Stethoscope,
            moduleSlug: "saude",
          },
        ],
      },
      {
        slug: "psicologia",
        label: "Psicologia",
        icon: ClipboardList,
        moduleSlug: "saude",
        children: [
          {
            slug: "psicologia_consultas",
            label: "Consultas",
            href: "/dashboard/consultas",
            icon: ClipboardList,
            moduleSlug: "saude",
          },
        ],
      },
      {
        slug: "saude_fisiologia",
        label: "Fisiologia",
        href: "/dashboard/futebol/fisiologia",
        icon: Heart,
        moduleSlug: "futebol_fisiologia",
      },
      {
        slug: "saude_fisioterapia",
        label: "Fisioterapia",
        href: "/dashboard/saude/fisioterapia",
        icon: Activity,
        moduleSlug: "saude",
      },
      {
        slug: "saude_nutricao",
        label: "Nutrição",
        href: "/dashboard/adm/nutricao",
        icon: UtensilsCrossed,
        moduleSlug: "adm_nutricao",
      },
      {
        slug: "saude_cadastros",
        label: "Cadastros",
        icon: Database,
        moduleSlug: "saude",
        children: [
          {
            slug: "cad_medicos",
            label: "Médicos",
            href: "/dashboard/medico/equipe",
            icon: Stethoscope,
            moduleSlug: "saude",
          },
          {
            slug: "cad_enfermeiros",
            label: "Enfermeiros",
            href: "/dashboard/medico/enfermeiros",
            icon: Heart,
            moduleSlug: "saude",
          },
          {
            slug: "cad_psicologos",
            label: "Psicólogos",
            href: "/dashboard/psicologia/psicologos",
            icon: UserCircle,
            moduleSlug: "saude",
          },
        ],
      },
      hubRelatorio("saude"),
    ],
  },
  {
    slug: "futebol",
    label: "Depto Futebol",
    icon: Shirt,
    moduleSlug: "futebol_logistica",
    children: [
      {
        slug: "futebol_visao",
        label: "Visão geral",
        href: "/dashboard/futebol",
        icon: LayoutDashboard,
        moduleSlug: "futebol_logistica",
      },
      {
        slug: "futebol_agenda",
        label: "Agenda",
        icon: Calendar,
        moduleSlug: "futebol_logistica",
        children: [
          {
            slug: "futebol_agenda_cal",
            label: "Calendário",
            href: "/dashboard/futebol/agenda",
            icon: Calendar,
            moduleSlug: "futebol_logistica",
          },
        ],
      },
      {
        slug: "futebol_logistica",
        label: "Logística",
        href: "/dashboard/futebol/logistica",
        icon: MapIcon,
        moduleSlug: "futebol_logistica",
      },
      {
        slug: "analise",
        label: "Análise",
        icon: BarChart3,
        moduleSlug: "diretoria",
        children: [
          {
            slug: "avaliacoes",
            label: "Avaliações",
            href: "/dashboard/futebol/avaliacoes",
            icon: Star,
            moduleSlug: "diretoria",
          },
          {
            slug: "desempenho",
            label: "Desempenho",
            href: "/dashboard/futebol/analise",
            icon: BarChart3,
            moduleSlug: "futebol_analise",
          },
        ],
      },
      {
        slug: "futebol_comissao",
        label: "Comissão técnica",
        href: "/dashboard/futebol/comissao",
        icon: Users,
        moduleSlug: "futebol_comissao",
      },
      {
        slug: "futebol_fisiologia",
        label: "Fisiologia",
        href: "/dashboard/futebol/fisiologia",
        icon: Heart,
        moduleSlug: "futebol_fisiologia",
      },
      {
        slug: "futebol_cadastros",
        label: "Cadastros",
        icon: Database,
        moduleSlug: "tipos",
        children: [
          {
            slug: "cad_jogadores",
            label: DASHBOARD_LABELS.atletas,
            href: "/dashboard/cadastros/jogadores",
            icon: UserCircle,
            moduleSlug: "tipos",
          },
          {
            slug: "cad_jogadores_desligados",
            label: "Atletas desligados",
            href: "/dashboard/cadastros/jogadores/arquivo",
            icon: Archive,
            moduleSlug: "tipos",
          },
          {
            slug: "cad_campeonatos",
            label: "Campeonatos",
            href: "/dashboard/cadastros/campeonatos",
            icon: Trophy,
            moduleSlug: "tipos",
          },
          {
            slug: "cad_estadios",
            label: DASHBOARD_LABELS.estadios,
            href: "/dashboard/cadastros/estadios",
            icon: MapPin,
            moduleSlug: "tipos",
          },
          {
            slug: "cad_times",
            label: DASHBOARD_LABELS.timesAdversarios,
            href: "/dashboard/cadastros/times",
            icon: Shirt,
            moduleSlug: "tipos",
          },
          {
            slug: "cad_categorias",
            label: "Categoria",
            href: "/dashboard/cadastros/categorias",
            icon: Layers,
            moduleSlug: "tipos",
          },
        ],
      },
      hubRelatorio("futebol"),
    ],
  },
  {
    slug: "juridico",
    label: "Depto Jurídico",
    icon: Scale,
    moduleSlug: "juridico",
    children: [
      {
        slug: "juridico_visao",
        label: "Visão geral",
        href: "/dashboard/juridico",
        icon: Scale,
        moduleSlug: "juridico",
      },
      {
        slug: "juridico_contratos_base",
        label: "Contratos base",
        href: "/dashboard/juridico/contratos-base",
        icon: FileText,
        moduleSlug: "juridico",
      },
      hubRelatorio("juridico"),
    ],
  },
  {
    slug: "eventos",
    label: "Depto de Eventos",
    icon: Calendar,
    moduleSlug: "eventos",
    children: [
      {
        slug: "eventos_lista",
        label: "Eventos",
        href: "/dashboard/eventos",
        icon: Calendar,
        moduleSlug: "eventos",
      },
      {
        slug: "eventos_boston_hall",
        label: "Boston City Hall",
        icon: Building2,
        moduleSlug: "eventos",
        children: [
          {
            slug: "boston_hall_visao",
            label: "Visão geral",
            href: "/dashboard/eventos/boston-city-hall",
            icon: Building2,
            moduleSlug: "eventos",
          },
        ],
      },
      hubRelatorio("eventos"),
    ],
  },
  {
    slug: "marketing",
    label: "Depto de Mkt",
    icon: Megaphone,
    moduleSlug: "marketing",
    children: [
      { slug: "marketing_planner", label: "Planner", href: "/dashboard/marketing", icon: Calendar, moduleSlug: "marketing" },
      {
        slug: "marketing_boston_tv",
        label: "Boston TV",
        href: "/dashboard/marketing/boston-tv",
        icon: Tv,
        moduleSlug: "boston_tv",
      },
      {
        slug: "marketing_midias",
        label: "Mídias",
        href: "/dashboard/midia",
        icon: Image,
        moduleSlug: "midia",
      },
      {
        slug: "marketing_paginas",
        label: "Construção Web",
        href: "/dashboard/paginas",
        icon: FileText,
        moduleSlug: "paginas",
      },
      {
        slug: "marketing_noticias",
        label: "RSS Notícias",
        href: "/dashboard/noticias",
        icon: Newspaper,
        moduleSlug: "noticias",
      },
      hubRelatorio("marketing"),
    ],
  },
  {
    slug: "academias",
    label: "Academias",
    icon: GraduationCap,
    moduleSlug: "academias",
    children: [
      {
        slug: "academias_gestao",
        label: "Gestão",
        href: "/dashboard/academias/gestao",
        icon: LayoutDashboard,
        moduleSlug: "academias",
      },
      {
        slug: "academias_portal",
        label: "Portal do aluno",
        href: "/dashboard/academias/portal",
        icon: UserCircle,
        moduleSlug: "academias",
      },
    ],
  },
  {
    slug: "socio_torcedor",
    label: "Sócio Torcedor",
    icon: Ticket,
    moduleSlug: "socio_torcedor",
    children: [
      { slug: "socio_dashboard", label: "Visão geral", href: "/dashboard/socio-torcedor", icon: LayoutDashboard, moduleSlug: "socio_torcedor" },
      { slug: "socio_socios", label: "Sócios", href: "/dashboard/socio-torcedor/socios", icon: Users, moduleSlug: "socio_torcedor" },
      {
        slug: "socio_cadastros",
        label: "Cadastros",
        icon: Database,
        moduleSlug: "socio_torcedor",
        children: [
          {
            slug: "cad_socio_planos",
            label: "Planos sócio-torcedor",
            href: "/dashboard/socio-torcedor/planos",
            icon: Heart,
            moduleSlug: "socio_torcedor",
          },
        ],
      },
      hubRelatorio("socio_torcedor"),
    ],
  },
  {
    slug: "ferramentas",
    label: "Ferramentas",
    icon: Wrench,
    moduleSlug: "emails",
    children: [
      {
        slug: "emails",
        label: "Emails",
        href: "/dashboard/emails",
        icon: Mail,
        moduleSlug: "emails",
      },
      {
        slug: "vault",
        label: "Senhas",
        href: "/dashboard/senhas",
        icon: KeyRound,
        moduleSlug: "vault",
      },
    ],
  },
  {
    slug: "configuracoes",
    label: DASHBOARD_LABELS.configuracoes,
    icon: Settings,
    moduleSlug: "configuracoes",
    children: [
      {
        slug: "config_acessos",
        label: "Acessos",
        href: "/dashboard/configuracoes/modulos",
        icon: Sliders,
        moduleSlug: "configuracoes",
      },
      {
        slug: "config_empresas",
        label: "Empresas / clubes",
        href: "/dashboard/empresas",
        icon: Building2,
        moduleSlug: "empresas",
      },
      {
        slug: "config_usuarios",
        label: DASHBOARD_LABELS.usuarios,
        href: "/dashboard/usuarios",
        icon: Users,
        moduleSlug: "usuarios",
      },
      {
        slug: "config_compras",
        label: "Requisições",
        href: "/dashboard/configuracoes/compras",
        icon: ClipboardList,
        moduleSlug: "configuracoes",
      },
      {
        slug: "config_integracoes",
        label: "Integrações",
        href: "/dashboard/configuracoes/integracoes",
        icon: Link2,
        moduleSlug: "configuracoes",
      },
    ],
  },
];

/** Extrai todos os slugs de módulo únicos (folhas do menu + abas do jogador). */
export function getUniqueModuleSlugs(): string[] {
  const slugs = new Set<string>();
  function walk(items: MenuItemConfig[]) {
    for (const item of items) {
      if (item.children?.length) {
        walk(item.children);
        slugs.add(item.moduleSlug);
      } else if (item.href && !item.external) {
        slugs.add(item.moduleSlug);
      }
    }
  }
  walk(DASHBOARD_MENU);
  for (const tab of PLAYER_TABS) {
    if (tab.moduleSlug) slugs.add(tab.moduleSlug);
  }
  slugs.add("saude").add("diretoria").add("juridico").add("relatorios");
  slugs
    .add("adm_financeiro")
    .add("adm_compras")
    .add("adm_estoque")
    .add("adm_rh")
    .add("adm_patrimonio")
    .add("adm_nutricao")
    .add("requisicoes")
    .add("adm_ti");
  slugs
    .add("futebol_comissao")
    .add("futebol_fisiologia")
    .add("futebol_analise")
    .add("futebol_logistica");
  slugs.add("socio_torcedor").add("marketing").add("boston_tv").add("eventos").add("academias");
  return Array.from(slugs).sort();
}

export interface MenuDepartmentModule {
  slug: string;
  menuLabels: string[];
}

/** Agrupa módulos como no menu lateral (Depto Adm, Cadastros, etc.). */
export interface MenuDepartmentGroup {
  id: string;
  label: string;
  modules: MenuDepartmentModule[];
}

/** Nó da árvore de acessos — espelha seções e subseções do menu lateral. */
export interface MenuAccessTreeNode {
  id: string;
  label: string;
  kind: "group" | "leaf";
  moduleSlug?: string;
  menuSlug?: string;
  href?: string;
  children: MenuAccessTreeNode[];
}

/** Coleta todos os moduleSlug das folhas de um nó. */
export function collectTreeModuleSlugs(node: MenuAccessTreeNode): string[] {
  if (node.kind === "leaf" && node.moduleSlug) return [node.moduleSlug];
  return node.children.flatMap(collectTreeModuleSlugs);
}

function walkMenuAccessItems(items: MenuItemConfig[], pathPrefix: string): MenuAccessTreeNode[] {
  const nodes: MenuAccessTreeNode[] = [];
  for (const item of items) {
    const id = `${pathPrefix}/${item.slug}`;
    if (item.children?.length) {
      const children = walkMenuAccessItems(item.children, id);
      if (children.length > 0) {
        nodes.push({
          id,
          label: item.label,
          kind: "group",
          menuSlug: item.slug,
          children,
        });
      }
    } else if (item.href && !item.external) {
      nodes.push({
        id,
        label: item.label,
        kind: "leaf",
        moduleSlug: item.moduleSlug,
        menuSlug: item.slug,
        href: item.href,
        children: [],
      });
    }
  }
  return nodes;
}

/**
 * Árvore completa para Configurações → Acessos.
 * Obrigatório: qualquer item novo em DASHBOARD_MENU / PLAYER_TABS aparece aqui automaticamente.
 */
export function getMenuAccessTree(): MenuAccessTreeNode[] {
  const roots: MenuAccessTreeNode[] = [];

  for (const top of DASHBOARD_MENU) {
    if (top.children?.length) {
      const children = walkMenuAccessItems(top.children, top.slug);
      if (children.length > 0) {
        roots.push({
          id: top.slug,
          label: top.label,
          kind: "group",
          menuSlug: top.slug,
          children,
        });
      }
    } else if (top.href && !top.external) {
      roots.push({
        id: top.slug,
        label: top.label,
        kind: "leaf",
        moduleSlug: top.moduleSlug,
        menuSlug: top.slug,
        href: top.href,
        children: [],
      });
    }
  }

  const playerChildren: MenuAccessTreeNode[] = [];
  for (const tab of PLAYER_TABS) {
    if (!tab.moduleSlug) continue;
    playerChildren.push({
      id: `player_tabs/${tab.id}`,
      label: tab.label,
      kind: "leaf",
      moduleSlug: tab.moduleSlug,
      menuSlug: tab.id,
      children: [],
    });
  }
  if (playerChildren.length > 0) {
    roots.push({
      id: "player_tabs",
      label: `${DASHBOARD_LABELS.atletas} (abas)`,
      kind: "group",
      menuSlug: "player_tabs",
      children: playerChildren,
    });
  }

  return roots;
}

/** Catálogo para sync com a API (nomes amigáveis preenchidos no front). */
export function buildModuleCatalog(names: Record<string, string>): Array<{
  slug: string;
  name: string;
  sortOrder: number;
}> {
  return getUniqueModuleSlugs().map((slug, index) => ({
    slug,
    name: names[slug] ?? slug,
    sortOrder: index,
  }));
}

/** Coleta slugs + rótulos de menu por departamento de primeiro nível. */
export function getMenuDepartmentGroups(): MenuDepartmentGroup[] {
  const groups: MenuDepartmentGroup[] = [];

  function collectFromTop(top: MenuItemConfig) {
    const bySlug = new Map<string, string[]>();

    function addLabel(slug: string, label: string) {
      const list = bySlug.get(slug) ?? [];
      if (!list.includes(label)) list.push(label);
      bySlug.set(slug, list);
    }

    function walk(items: MenuItemConfig[]) {
      for (const item of items) {
        if (item.children?.length) {
          walk(item.children);
        } else if (item.href && !item.external) {
          addLabel(item.moduleSlug, item.label);
        }
      }
    }

    if (top.children?.length) {
      walk(top.children);
    } else if (top.href && !top.external) {
      addLabel(top.moduleSlug, top.label);
    }

    const modules = [...bySlug.entries()]
      .map(([slug, labels]) => ({ slug, menuLabels: [...labels].sort() }))
      .sort((a, b) => a.slug.localeCompare(b.slug));

    if (modules.length > 0) {
      groups.push({ id: top.slug, label: top.label, modules });
    }
  }

  for (const top of DASHBOARD_MENU) {
    collectFromTop(top);
  }

  const playerBySlug = new Map<string, string[]>();
  for (const tab of PLAYER_TABS) {
    if (!tab.moduleSlug) continue;
    const list = playerBySlug.get(tab.moduleSlug) ?? [];
    if (!list.includes(tab.label)) list.push(tab.label);
    playerBySlug.set(tab.moduleSlug, list);
  }
  if (playerBySlug.size > 0) {
    groups.push({
      id: "player_tabs",
      label: `${DASHBOARD_LABELS.atletas} (abas)`,
      modules: [...playerBySlug.entries()]
        .map(([slug, labels]) => ({ slug, menuLabels: [...labels].sort() }))
        .sort((a, b) => a.slug.localeCompare(b.slug)),
    });
  }

  return groups;
}
