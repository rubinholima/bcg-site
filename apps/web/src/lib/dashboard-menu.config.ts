/**
 * Fonte de verdade do menu do dashboard.
 * Menus, submenus e abas dos jogadores — ao adicionar itens aqui,
 * eles aparecem automaticamente na sidebar e em Configurações → Módulos.
 * Fase 1: Diretoria, Empresas, Futebol, Ferramentas, Configurações (com Usuários).
 * Fase 3: Adm, Futebol (Comissão, Fisiologia, Análise/Desempenho), Relatórios, Sócio Torcedor, Marketing.
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
  Map,
  Youtube,
  ImageIcon,
  Scale,
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
} from "lucide-react";
import { DASHBOARD_LABELS } from "./dashboard-labels";

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
  { id: "mapa", label: "Mapa / Posição", icon: Map, moduleSlug: null },
  { id: "momentos", label: "Melhores momentos", icon: Youtube, moduleSlug: null },
  { id: "imagens", label: "Imagens", icon: ImageIcon, moduleSlug: null },
  { id: "desempenho", label: "Análise de desempenho", icon: BarChart3, moduleSlug: "futebol_analise" },
];

/** Estrutura completa do menu do dashboard (Fase 1). */
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
    href: "/dashboard/grupo",
    icon: Globe,
    moduleSlug: "grupo_master",
  },
  // Diretoria (acima de Empresas)
  {
    slug: "diretoria",
    label: "Diretoria",
    icon: BarChart3,
    moduleSlug: "diretoria",
    children: [
      {
        slug: "diretoria_dashboard",
        label: "Dashboard gerencial",
        href: "/dashboard/diretoria",
        icon: LayoutDashboard,
        moduleSlug: "diretoria",
      },
    ],
  },
  // Empresas (Listagem + Tipos)
  {
    slug: "empresas",
    label: "Empresas",
    icon: Building2,
    moduleSlug: "empresas",
    children: [
      {
        slug: "empresas_listagem",
        label: "Listagem",
        href: "/dashboard/empresas",
        icon: Building2,
        moduleSlug: "empresas",
      },
      {
        slug: "tipos_negocio",
        label: "Tipos de Negócios",
        href: "/dashboard/cadastros/tipos",
        icon: Tag,
        moduleSlug: "tipos",
      },
    ],
  },
  // Adm (Fase 3 — departamento administrativo). Financeiro, Compras e Estoque (Omie) agrupados.
  {
    slug: "adm",
    label: "Adm",
    icon: Building2,
    moduleSlug: "adm_financeiro",
    children: [
      { slug: "adm_financeiro", label: "Financeiro", href: "/dashboard/adm/financeiro", icon: DollarSign, moduleSlug: "adm_financeiro", compactGroup: "omie" },
      { slug: "adm_compras", label: "Compras", href: "/dashboard/adm/compras", icon: ShoppingCart, moduleSlug: "adm_compras", compactGroup: "omie" },
      { slug: "adm_estoque", label: "Estoque", href: "/dashboard/adm/estoque", icon: Package, moduleSlug: "adm_estoque", compactGroup: "omie" },
      { slug: "adm_rh", label: "RH", href: "/dashboard/adm/rh", icon: Users, moduleSlug: "adm_rh" },
      { slug: "adm_patrimonio", label: "Patrimônio", href: "/dashboard/adm/patrimonio", icon: Warehouse, moduleSlug: "adm_patrimonio" },
    ],
  },
  // Departamento de Futebol (Atletas, Categorias, Campeonatos, Estádios, Times, Médico, Psicologia, Comissão, Fisiologia, Análise, Logística)
  {
    slug: "futebol",
    label: "Depto Futebol",
    icon: Shirt,
    moduleSlug: "tipos",
    children: [
      {
        slug: "jogadores",
        label: DASHBOARD_LABELS.atletas,
        href: "/dashboard/cadastros/jogadores",
        icon: UserCircle,
        moduleSlug: "tipos",
      },
      {
        slug: "categorias",
        label: "Categorias",
        href: "/dashboard/cadastros/categorias",
        icon: Layers,
        moduleSlug: "tipos",
      },
      {
        slug: "campeonatos",
        label: "Campeonatos",
        href: "/dashboard/cadastros/campeonatos",
        icon: Trophy,
        moduleSlug: "tipos",
      },
      {
        slug: "estadios",
        label: DASHBOARD_LABELS.estadios,
        href: "/dashboard/cadastros/estadios",
        icon: MapPin,
        moduleSlug: "tipos",
      },
      {
        slug: "times",
        label: DASHBOARD_LABELS.timesAdversarios,
        href: "/dashboard/cadastros/times",
        icon: Shirt,
        moduleSlug: "tipos",
      },
      {
        slug: "medico",
        label: "Depto Médico",
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
          {
            slug: "medico_equipe",
            label: "Médicos e equipe",
            href: "/dashboard/medico/equipe",
            icon: UserCircle,
            moduleSlug: "saude",
          },
        ],
      },
      {
        slug: "psicologia",
        label: "Depto Psicologia",
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
          {
            slug: "psicologia_psicologos",
            label: "Psicólogos",
            href: "/dashboard/psicologia/psicologos",
            icon: UserCircle,
            moduleSlug: "saude",
          },
        ],
      },
      {
        slug: "juridico",
        label: "Depto Jurídico",
        href: "/dashboard/juridico",
        icon: Scale,
        moduleSlug: "juridico",
      },
      {
        slug: "futebol_comissao",
        label: "Comissão técnica",
        href: "/dashboard/futebol/comissao",
        icon: Users,
        moduleSlug: "futebol_comissao",
      },
      {
        slug: "futebol_logistica",
        label: "Logística",
        href: "/dashboard/futebol/logistica",
        icon: Map,
        moduleSlug: "futebol_logistica",
      },
      {
        slug: "futebol_fisiologia",
        label: "Fisiologia",
        href: "/dashboard/futebol/fisiologia",
        icon: Heart,
        moduleSlug: "futebol_fisiologia",
      },
      {
        slug: "adm_nutricao",
        label: "Nutrição",
        href: "/dashboard/adm/nutricao",
        icon: UtensilsCrossed,
        moduleSlug: "adm_nutricao",
      },
      // Análise: Avaliações (CRUD da comissão) e Desempenho (métricas + relatório)
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
    ],
  },
  // Sócio Torcedor (Fase 3) — controle completo por clube: planos, sócios, perks, métricas
  {
    slug: "socio_torcedor",
    label: "Sócio Torcedor",
    icon: Ticket,
    moduleSlug: "socio_torcedor",
    children: [
      { slug: "socio_dashboard", label: "Visão geral", href: "/dashboard/socio-torcedor", icon: LayoutDashboard, moduleSlug: "socio_torcedor" },
      { slug: "socio_planos", label: "Planos", href: "/dashboard/socio-torcedor/planos", icon: Heart, moduleSlug: "socio_torcedor" },
      { slug: "socio_socios", label: "Sócios", href: "/dashboard/socio-torcedor/socios", icon: Users, moduleSlug: "socio_torcedor" },
    ],
  },
  // Marketing (Fase 3) — Calendário de conteúdo inspirado no Meta Business Suite
  {
    slug: "marketing",
    label: "Marketing",
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
    ],
  },
  // Relatórios (grupo — rotas futuras)
  {
    slug: "relatorios",
    label: "Relatórios",
    icon: BarChart3,
    moduleSlug: "relatorios",
    children: [
      {
        slug: "relatorios_dashboard",
        label: "Relatórios",
        href: "/dashboard/relatorios",
        icon: BarChart3,
        moduleSlug: "relatorios",
      },
    ],
  },
  // Ferramentas (Emails, Senhas, Páginas, Notícias, Mídia)
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
      {
        slug: "paginas",
        label: DASHBOARD_LABELS.paginas,
        href: "/dashboard/paginas",
        icon: FileText,
        moduleSlug: "paginas",
      },
      {
        slug: "eventos",
        label: "Eventos",
        href: "/dashboard/eventos",
        icon: Calendar,
        moduleSlug: "eventos",
      },
      {
        slug: "noticias",
        label: DASHBOARD_LABELS.noticias,
        href: "/dashboard/noticias",
        icon: Newspaper,
        moduleSlug: "noticias",
      },
      {
        slug: "midia",
        label: DASHBOARD_LABELS.midia,
        href: "/dashboard/midia",
        icon: Image,
        moduleSlug: "midia",
      },
    ],
  },
  // Configurações (Geral + Usuários)
  {
    slug: "configuracoes",
    label: DASHBOARD_LABELS.configuracoes,
    icon: Settings,
    moduleSlug: "configuracoes",
    children: [
      {
        slug: "config_geral",
        label: "Geral",
        href: "/dashboard/configuracoes",
        icon: Settings,
        moduleSlug: "configuracoes",
      },
      {
        slug: "usuarios",
        label: DASHBOARD_LABELS.usuarios,
        href: "/dashboard/usuarios",
        icon: Users,
        moduleSlug: "usuarios",
      },
    ],
  },
];

/** Extrai todos os slugs de módulo únicos (folhas do menu + abas do jogador). */
export function getUniqueModuleSlugs(): string[] {
  const slugs = new Set<string>();
  function walk(items: MenuItemConfig[]) {
    for (const item of items) {
      if (item.children?.length) walk(item.children);
      if (item.href && !item.external) slugs.add(item.moduleSlug);
    }
  }
  walk(DASHBOARD_MENU);
  for (const tab of PLAYER_TABS) {
    if (tab.moduleSlug) slugs.add(tab.moduleSlug);
  }
  slugs.add("saude").add("diretoria").add("juridico").add("relatorios");
  slugs.add("adm_financeiro").add("adm_rh").add("adm_patrimonio").add("adm_nutricao");
  slugs.add("futebol_comissao").add("futebol_fisiologia").add("futebol_analise").add("futebol_logistica");
  slugs.add("socio_torcedor").add("marketing").add("boston_tv");
  return Array.from(slugs).sort();
}
