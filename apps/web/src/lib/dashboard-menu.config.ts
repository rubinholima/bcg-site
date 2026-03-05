/**
 * Fonte de verdade do menu do dashboard.
 * Menus, submenus e abas dos jogadores — ao adicionar itens aqui,
 * eles aparecem automaticamente na sidebar e em Configurações → Módulos.
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
  HardHat,
  Building2,
  Stethoscope,
  Brain,
  Star,
  Activity,
  Map,
  Youtube,
  ImageIcon,
  BarChart3,
} from "lucide-react";
import { DASHBOARD_LABELS } from "./dashboard-labels";

export interface MenuItemConfig {
  slug: string;
  label: string;
  href?: string;
  icon?: LucideIcon;
  moduleSlug: string; // slug do módulo para controle de acesso
  children?: MenuItemConfig[];
  external?: boolean;
}

export interface PlayerTabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  moduleSlug: string | null; // null = todos com acesso a jogadores veem
}

/** Abas do formulário de jogador. */
export const PLAYER_TABS: PlayerTabConfig[] = [
  { id: "dados", label: "Dados base", icon: UserCircle, moduleSlug: null },
  { id: "medico", label: "Histórico médico", icon: Stethoscope, moduleSlug: "medico" },
  { id: "psicologica", label: "Avaliação psicológica", icon: Brain, moduleSlug: "psicologia" },
  { id: "avaliacoes", label: "Avaliações", icon: Star, moduleSlug: "diretoria" },
  { id: "status", label: "Status", icon: Activity, moduleSlug: "diretoria" },
  { id: "mapa", label: "Mapa / Posição", icon: Map, moduleSlug: null },
  { id: "momentos", label: "Melhores momentos", icon: Youtube, moduleSlug: null },
  { id: "imagens", label: "Imagens", icon: ImageIcon, moduleSlug: null },
  { id: "desempenho", label: "Análise de desempenho", icon: BarChart3, moduleSlug: null },
  { id: "juridico", label: "Controle Jurídico", icon: FileText, moduleSlug: "juridico" },
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
    href: "/dashboard/grupo",
    icon: Globe,
    moduleSlug: "grupo_master",
  },
  // Cadastros (grupo colapsável)
  {
    slug: "cadastros",
    label: "Cadastros",
    icon: Tag,
    moduleSlug: "cadastros",
    children: [
      {
        slug: "usuarios",
        label: DASHBOARD_LABELS.usuarios,
        href: "/dashboard/usuarios",
        icon: Users,
        moduleSlug: "usuarios",
      },
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
      {
        slug: "clubes",
        label: "Clubes Assets",
        icon: Shirt,
        moduleSlug: "tipos",
        children: [
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
            slug: "jogadores",
            label: "Jogadores",
            href: "/dashboard/cadastros/jogadores",
            icon: UserCircle,
            moduleSlug: "tipos",
          },
        ],
      },
    ],
  },
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
  {
    slug: "configuracoes",
    label: DASHBOARD_LABELS.configuracoes,
    href: "/dashboard/configuracoes",
    icon: Settings,
    moduleSlug: "configuracoes",
  },
  {
    slug: "buildertrend",
    label: "Buildertrend",
    href: "https://buildertrend.net/",
    icon: HardHat,
    moduleSlug: "dashboard",
    external: true,
  },
];

/** Extrai todos os slugs de módulo únicos (apenas folhas e abas do jogador). */
export function getUniqueModuleSlugs(): string[] {
  const slugs = new Set<string>();
  function walk(items: MenuItemConfig[]) {
    for (const item of items) {
      if (item.children) walk(item.children);
      else if (item.href && !item.external) slugs.add(item.moduleSlug);
    }
  }
  walk(DASHBOARD_MENU);
  for (const tab of PLAYER_TABS) {
    if (tab.moduleSlug) slugs.add(tab.moduleSlug);
  }
  slugs.add("psicologia").add("medico").add("diretoria").add("juridico");
  return Array.from(slugs).sort();
}

/** Índice do Cadastros em DASHBOARD_MENU (para inserção na ordem correta). */
export const CADASTROS_INDEX = DASHBOARD_MENU.findIndex((m) => m.slug === "cadastros");
