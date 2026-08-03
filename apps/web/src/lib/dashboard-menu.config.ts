/**
 * Fonte de verdade do menu do dashboard.
 * Menus, submenus e abas dos jogadores — ao adicionar itens aqui,
 * eles aparecem automaticamente na sidebar e em Configurações → Módulos.
 *
 * Operação: demais grupos — movimentações e telas do dia a dia (URLs inalteradas).
 * Cadastros MDM ficam dentro de cada departamento — submenu **Cadastros** logo após o Dash;
 * **Relatórios** sempre por último em cada dept.
 *
 * REGRA Acessos: cada item de menu tem slug de permissão individual (accessSlug);
 * accessGroup só para itens que compartilham a mesma permissão (raro).
 * Sync automático via buildModuleCatalog() ao abrir Configurações → Acessos.
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
  Kanban,
  Link2,
  Truck,
  ClipboardCheck,
  Gauge,
  UserPlus,
  Video,
  Dumbbell,
  FolderOpen,
  Server,
  Cable,
  HardDrive,
  ShieldAlert,
  Shield,
  MessageCircle,
  MessagesSquare,
  Network,
  Hotel,
  CalendarRange,
  Clock,
  CreditCard,
} from "lucide-react";
import { DASHBOARD_LABELS, DEPT_HUB_MENU_LABEL } from "./dashboard-labels";
import { BCH_LOGO_STATIC } from "./boston-city-hall";
import {
  LOGISTICA_CADASTRO_RESOURCES,
  LOGISTICA_CADASTROS_BASE,
} from "./logistica-cadastros.config";

/** Rótulos de grupos de permissão compartilhada (accessGroup). */
export const ACCESS_GROUP_LABELS: Record<string, string> = {};

/** Relatórios Futebol — agora em Logística (mantido para redirects/atalhos). */
export function hubRelatorioFutebol(): MenuItemConfig {
  const slug = "futebol_logistica";
  return {
    slug: "rel_futebol",
    label: "Relatórios",
    href: "/dashboard/futebol/logistica/relatorios",
    icon: BarChart3,
    moduleSlug: slug,
    children: [
      {
        slug: "rel_futebol_passageiros",
        label: "Passageiros",
        href: "/dashboard/futebol/logistica/relatorios/passageiros",
        icon: Users,
        moduleSlug: slug,
      },
      {
        slug: "rel_futebol_hospedes",
        label: "Hóspedes",
        href: "/dashboard/futebol/logistica/relatorios/hospedes",
        icon: Hotel,
        moduleSlug: slug,
      },
      {
        slug: "rel_futebol_programacao",
        label: "Programação semanal",
        href: "/dashboard/futebol/logistica/relatorios/programacao-semanal",
        icon: CalendarRange,
        moduleSlug: slug,
      },
    ],
  };
}

/** Relatórios por hub — permissão isolada por departamento (sem herdar `relatorios` global). */
export function hubRelatorio(hub: string): MenuItemConfig {
  const slug = `relatorios_${hub}`;
  return {
    slug: `rel_${hub}`,
    label: "Relatórios",
    href: `/dashboard/relatorios?hub=${hub}`,
    icon: BarChart3,
    moduleSlug: slug,
    accessSlug: slug,
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
  /** Permissão individual no Acessos (padrão: deptSlug__itemSlug). */
  accessSlug?: string;
  /** Mesmo valor = mesma permissão (só para módulos interdependentes). */
  accessGroup?: string;
  /** Logo no menu (substitui o ícone Lucide quando definido). */
  menuLogoSrc?: string;
  /** Visível apenas para super_admin (ex.: cadastro de perfis). */
  superAdminOnly?: boolean;
}

/** Slug de permissão usado no Acessos e na sidebar. */
export function resolveMenuAccessSlug(item: MenuItemConfig, pathPrefix: string): string {
  if (item.accessSlug) return item.accessSlug;
  if (item.accessGroup) return `group_${item.accessGroup}`;
  return `${pathPrefix}__${item.slug}`;
}

export interface MenuAccessCatalogEntry {
  slug: string;
  name: string;
  moduleSlug: string;
  sortOrder: number;
  impliesSlug?: string;
}

/** Verifica acesso a um item folha do menu (com fallback ao moduleSlug legado). */
export function canAccessMenuLeaf(
  item: MenuItemConfig,
  pathPrefix: string,
  canAccessModule: (slug: string) => boolean,
): boolean {
  const accessSlug = resolveMenuAccessSlug(item, pathPrefix);
  return canAccessModule(accessSlug) || canAccessModule(item.moduleSlug);
}

/** Verifica acesso a item do menu (folha ou ramo com filho liberado). */
export function hasAccessToMenuItem(
  item: MenuItemConfig,
  pathPrefix: string,
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): boolean {
  if (item.superAdminOnly && !isSuperAdmin) return false;
  if (item.moduleSlug === "emails" && canAccessDashboard) return true;
  if (item.children?.length) {
    const nestedPrefix = `${pathPrefix}/${item.slug}`;
    return item.children.some((c) =>
      hasAccessToMenuItem(c, nestedPrefix, canAccessModule, canAccessDashboard, isSuperAdmin),
    );
  }
  if (item.href && !item.external) return canAccessMenuLeaf(item, pathPrefix, canAccessModule);
  return canAccessModule(item.moduleSlug);
}

/** Relatórios de um departamento (hub). */
export function canAccessHubRelatorios(
  hub: string,
  canAccessModule: (slug: string) => boolean,
): boolean {
  return canAccessModule(`relatorios_${hub}`);
}

export interface PlayerTabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  moduleSlug: string | null;
}

/** Abas do formulário de jogador. Avaliação psicológica e Análise de desempenho exigem módulo. */
export const PLAYER_TABS: PlayerTabConfig[] = [
  { id: "dados", label: "Dados", icon: UserCircle, moduleSlug: null },
  { id: "psicologica", label: "Psicológica", icon: Brain, moduleSlug: "saude" },
  { id: "fisioterapia", label: "Fisioterapia", icon: Activity, moduleSlug: "saude" },
  { id: "status", label: "Status", icon: Activity, moduleSlug: "diretoria" },
  { id: "mapa", label: "Mapa", icon: MapIcon, moduleSlug: null },
  { id: "momentos", label: "Momentos", icon: Youtube, moduleSlug: null },
  { id: "imagens", label: "Imagens", icon: ImageIcon, moduleSlug: null },
  { id: "desempenho", label: "Desempenho", icon: BarChart3, moduleSlug: "futebol_analise" },
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
      {
        slug: "infraestrutura",
        label: "Infraestrutura",
        icon: Server,
        moduleSlug: "infraestrutura",
        children: [
          {
            slug: "infra_dashboard",
            label: "Dashboard",
            href: "/dashboard/requisicoes/infraestrutura",
            icon: LayoutDashboard,
            moduleSlug: "infraestrutura",
          },
          {
            slug: "infra_rede",
            label: "Rede",
            href: "/dashboard/requisicoes/infraestrutura/rede",
            icon: Cable,
            moduleSlug: "infraestrutura",
          },
          {
            slug: "infra_topologia",
            label: "Topologia",
            href: "/dashboard/requisicoes/infraestrutura/topologia",
            icon: Network,
            moduleSlug: "infraestrutura",
          },
          {
            slug: "infra_backbone",
            label: "Backbone",
            href: "/dashboard/requisicoes/infraestrutura/backbone",
            icon: Cable,
            moduleSlug: "infraestrutura",
          },
          {
            slug: "infra_racks",
            label: "Racks",
            href: "/dashboard/requisicoes/infraestrutura/racks",
            icon: Server,
            moduleSlug: "infraestrutura",
          },
          {
            slug: "infra_documentacao",
            label: "Documentação",
            href: "/dashboard/requisicoes/infraestrutura/documentacao",
            icon: FolderOpen,
            moduleSlug: "infraestrutura",
          },
          {
            slug: "infra_credenciais",
            label: "Credenciais",
            href: "/dashboard/requisicoes/infraestrutura/credenciais",
            icon: KeyRound,
            moduleSlug: "infraestrutura",
          },
          {
            slug: "infra_backups",
            label: "Backups",
            href: "/dashboard/requisicoes/infraestrutura/backups",
            icon: HardDrive,
            moduleSlug: "infraestrutura",
          },
          {
            slug: "infra_dr",
            label: "Disaster Recovery",
            href: "/dashboard/requisicoes/infraestrutura/disaster-recovery",
            icon: ShieldAlert,
            moduleSlug: "infraestrutura",
          },
          {
            slug: "infra_monitoramento",
            label: "Monitoramento",
            href: "/dashboard/requisicoes/infraestrutura/monitoramento",
            icon: Gauge,
            moduleSlug: "infraestrutura",
          },
          {
            slug: "infra_config",
            label: "Configurações",
            href: "/dashboard/requisicoes/infraestrutura/configuracoes",
            icon: Sliders,
            moduleSlug: "infraestrutura",
          },
        ],
      },
    ],
  },
  {
    slug: "agenda",
    label: "Agenda",
    href: "/dashboard/agenda",
    icon: Calendar,
    moduleSlug: "agenda",
  },
  {
    slug: "futebol",
    label: "Depto de Futebol",
    icon: Shirt,
    moduleSlug: "futebol_logistica",
    children: [
      {
        slug: "futebol_visao",
        label: DEPT_HUB_MENU_LABEL,
        href: "/dashboard/futebol",
        icon: LayoutDashboard,
        moduleSlug: "futebol_logistica",
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
          {
            slug: "cad_espacos",
            label: "Espaços",
            href: "/dashboard/cadastros/espacos",
            icon: MapPin,
            moduleSlug: "futebol_logistica",
          },
        ],
      },
      {
        slug: "futebol_logistica",
        label: "Logística",
        icon: MapIcon,
        moduleSlug: "futebol_logistica",
        children: [
          {
            slug: "futebol_logistica_cadastros",
            label: "Cadastros",
            icon: Database,
            moduleSlug: "futebol_logistica",
            children: [
              {
                slug: "futebol_logistica_cad_hub",
                label: DEPT_HUB_MENU_LABEL,
                href: "/dashboard/futebol/logistica/cadastros",
                icon: LayoutDashboard,
                moduleSlug: "futebol_logistica",
              },
              {
                slug: "futebol_logistica_cad_fornecedores",
                label: "Fornecedores",
                href: "/dashboard/adm/fornecedores",
                icon: Truck,
                moduleSlug: "futebol_logistica",
              },
              ...LOGISTICA_CADASTRO_RESOURCES.map((resource) => ({
                slug: `futebol_logistica_cad_${resource.slug.replace(/-/g, "_")}`,
                label: resource.labelPlural,
                href: `${LOGISTICA_CADASTROS_BASE}/${resource.slug}`,
                icon: resource.icon,
                moduleSlug: "futebol_logistica" as const,
              })),
            ],
          },
          {
            slug: "futebol_logistica_viagens",
            label: "Viagens",
            href: "/dashboard/futebol/logistica",
            icon: MapIcon,
            moduleSlug: "futebol_logistica",
          },
          {
            slug: "futebol_logistica_convocacao",
            label: "Convocação",
            href: "/dashboard/futebol/logistica/convocacao",
            icon: ClipboardCheck,
            moduleSlug: "futebol_logistica",
          },
          {
            slug: "futebol_logistica_agenda",
            label: "Agenda",
            href: "/dashboard/futebol/logistica/agenda",
            icon: Calendar,
            moduleSlug: "futebol_logistica",
          },
          {
            slug: "futebol_logistica_relatorios",
            label: "Relatórios",
            href: "/dashboard/futebol/logistica/relatorios",
            icon: BarChart3,
            moduleSlug: "futebol_logistica",
            children: [
              {
                slug: "futebol_logistica_rel_passageiros",
                label: "Passageiros",
                href: "/dashboard/futebol/logistica/relatorios/passageiros",
                icon: Users,
                moduleSlug: "futebol_logistica",
              },
              {
                slug: "futebol_logistica_rel_hospedes",
                label: "Hóspedes",
                href: "/dashboard/futebol/logistica/relatorios/hospedes",
                icon: Hotel,
                moduleSlug: "futebol_logistica",
              },
              {
                slug: "futebol_logistica_rel_programacao",
                label: "Programação semanal",
                href: "/dashboard/futebol/logistica/relatorios/programacao-semanal",
                icon: CalendarRange,
                moduleSlug: "futebol_logistica",
              },
            ],
          },
        ],
      },
      {
        slug: "futebol_analise_desempenho",
        label: "Análise e desempenho",
        icon: Video,
        moduleSlug: "futebol_analise_desempenho",
        children: [
          {
            slug: "futebol_analise_desempenho_dash",
            label: DEPT_HUB_MENU_LABEL,
            href: "/dashboard/futebol/analise-desempenho",
            icon: LayoutDashboard,
            moduleSlug: "futebol_analise_desempenho",
          },
          {
            slug: "futebol_analise_video",
            label: "Análise de vídeo",
            href: "/dashboard/futebol/analise-desempenho/video",
            icon: Video,
            moduleSlug: "futebol_analise_desempenho",
          },
          {
            slug: "futebol_metricas_atletas",
            label: "Métricas de atletas",
            href: "/dashboard/futebol/analise",
            icon: BarChart3,
            moduleSlug: "futebol_analise",
          },
        ],
      },
      {
        slug: "futebol_performance",
        label: "Performance",
        icon: Gauge,
        moduleSlug: "futebol_performance",
        children: [
          {
            slug: "futebol_performance_dash",
            label: DEPT_HUB_MENU_LABEL,
            href: "/dashboard/futebol/performance",
            icon: LayoutDashboard,
            moduleSlug: "futebol_performance",
          },
          {
            slug: "futebol_fisiologista",
            label: "Fisiologista",
            href: "/dashboard/futebol/fisiologia",
            icon: Heart,
            moduleSlug: "futebol_fisiologia",
          },
          {
            slug: "futebol_preparacao_fisica",
            label: "Preparação física",
            href: "/dashboard/futebol/preparacao-fisica",
            icon: Dumbbell,
            moduleSlug: "futebol_preparacao_fisica",
          },
          {
            slug: "futebol_nutricionista",
            label: "Nutricionista",
            href: "/dashboard/adm/nutricao",
            icon: UtensilsCrossed,
            moduleSlug: "adm_nutricao",
          },
        ],
      },
      {
        slug: "futebol_avaliacoes",
        label: "Avaliações",
        href: "/dashboard/futebol/avaliacoes",
        icon: Star,
        moduleSlug: "diretoria",
      },
      {
        slug: "futebol_captacao",
        label: "Captação",
        href: "/dashboard/futebol/captacao",
        icon: UserPlus,
        moduleSlug: "futebol_captacao",
      },
      {
        slug: "futebol_tryouts",
        label: "Try-outs",
        href: "/dashboard/futebol/try-outs",
        icon: ClipboardCheck,
        moduleSlug: "futebol_tryouts",
      },
      {
        slug: "futebol_comissao",
        label: "Comissão técnica",
        href: "/dashboard/futebol/comissao",
        icon: Users,
        moduleSlug: "futebol_comissao",
      },
    ],
  },
  {
    slug: "adm",
    label: "Depto Adm",
    icon: Building2,
    moduleSlug: "adm_visao",
    children: [
      {
        slug: "adm_visao",
        label: DEPT_HUB_MENU_LABEL,
        href: "/dashboard/adm",
        icon: LayoutDashboard,
        moduleSlug: "adm_visao",
      },
      {
        slug: "adm_cadastros",
        label: "Cadastros",
        icon: Database,
        moduleSlug: "adm_financeiro",
        children: [
          {
            slug: "adm_cad_clientes",
            label: "Clientes",
            href: "/dashboard/adm/clientes",
            icon: Users,
            moduleSlug: "adm_financeiro",
          },
          {
            slug: "adm_cad_fornecedores",
            label: "Fornecedores",
            href: "/dashboard/adm/fornecedores",
            icon: Truck,
            moduleSlug: "adm_compras",
          },
        ],
      },
      { slug: "adm_financeiro", label: "Financeiro", href: "/dashboard/adm/financeiro", icon: DollarSign, moduleSlug: "adm_financeiro" },
      { slug: "adm_financeiro_aprovacoes", label: "Aprovações compras", href: "/dashboard/adm/financeiro/aprovacoes", icon: CheckCircle, moduleSlug: "adm_financeiro" },
      { slug: "adm_compras", label: "Compras", href: "/dashboard/adm/compras", icon: ShoppingCart, moduleSlug: "adm_compras" },
      { slug: "adm_ti", label: "TI — Atendimento", href: "/dashboard/adm/ti", icon: Monitor, moduleSlug: "adm_ti" },
      { slug: "adm_estoque", label: "Estoque", href: "/dashboard/adm/estoque", icon: Package, moduleSlug: "adm_estoque" },
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
        label: DEPT_HUB_MENU_LABEL,
        href: "/dashboard/saude",
        icon: LayoutDashboard,
        moduleSlug: "saude",
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
          {
            slug: "cad_estagiarios",
            label: "Estagiários",
            href: "/dashboard/saude/estagiarios",
            icon: GraduationCap,
            moduleSlug: "saude",
          },
          {
            slug: "cad_fisioterapeutas",
            label: "Fisioterapeutas",
            href: "/dashboard/saude/fisioterapeutas",
            icon: Activity,
            moduleSlug: "saude",
          },
        ],
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
          {
            slug: "psicologia_relatorios",
            label: "Relatórios semanais",
            href: "/dashboard/psicologia/relatorios",
            icon: FileText,
            moduleSlug: "saude",
          },
          {
            slug: "psicologia_lista_atletas",
            label: "Lista de atletas",
            href: "/dashboard/psicologia/relatorios/lista-atletas",
            icon: Users,
            moduleSlug: "saude",
          },
          {
            slug: "psicologia_material_apoio",
            label: "Material de apoio",
            href: "/dashboard/psicologia/material-apoio",
            icon: FolderOpen,
            moduleSlug: "saude",
          },
        ],
      },
      {
        slug: "saude_fisioterapia",
        label: "Fisioterapia",
        icon: Activity,
        moduleSlug: "saude",
        children: [
          {
            slug: "saude_fisioterapia_atendimentos",
            label: "Atendimentos",
            href: "/dashboard/saude/fisioterapia",
            icon: Activity,
            moduleSlug: "saude",
          },
          {
            slug: "saude_fisioterapia_recovery_grupo",
            label: "Recovery em grupo",
            href: "/dashboard/saude/fisioterapia/recovery-grupo",
            icon: Users,
            moduleSlug: "saude",
          },
          {
            slug: "saude_fisioterapia_relatorios",
            label: "Relatórios",
            href: "/dashboard/saude/fisioterapia/relatorios/atendimentos",
            icon: BarChart3,
            moduleSlug: "saude",
            children: [
              {
                slug: "saude_fisioterapia_rel_atendimentos",
                label: "Atendimentos e gráficos",
                href: "/dashboard/saude/fisioterapia/relatorios/atendimentos",
                icon: BarChart3,
                moduleSlug: "saude",
              },
              {
                slug: "saude_fisioterapia_rel_lesionados",
                label: "Lesionados em tratamento",
                href: "/dashboard/saude/fisioterapia/relatorios/lesionados-ativos",
                icon: ClipboardList,
                moduleSlug: "saude",
              },
              {
                slug: "saude_fisioterapia_rel_carga",
                label: "Carga por fisioterapeuta",
                href: "/dashboard/saude/fisioterapia/relatorios/carga-fisio",
                icon: Users,
                moduleSlug: "saude",
              },
            ],
          },
        ],
      },
      hubRelatorio("saude"),
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
        label: DEPT_HUB_MENU_LABEL,
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
        menuLogoSrc: BCH_LOGO_STATIC,
        moduleSlug: "eventos",
        children: [
          {
            slug: "boston_hall_visao",
            label: DEPT_HUB_MENU_LABEL,
            href: "/dashboard/eventos/boston-city-hall",
            icon: Building2,
            moduleSlug: "eventos",
          },
          {
            slug: "boston_hall_crm",
            label: "CRM",
            href: "/dashboard/eventos/boston-city-hall/crm",
            icon: Users,
            moduleSlug: "eventos",
          },
          {
            slug: "boston_hall_reservas",
            label: "Reservas",
            href: "/dashboard/eventos/boston-city-hall/reservas",
            icon: ClipboardList,
            moduleSlug: "eventos",
          },
          {
            slug: "boston_hall_pipeline",
            label: "Pipeline",
            href: "/dashboard/eventos/boston-city-hall/pipeline",
            icon: Kanban,
            moduleSlug: "eventos",
          },
          {
            slug: "boston_hall_agenda",
            label: "Agenda",
            href: "/dashboard/eventos/boston-city-hall/agenda",
            icon: Calendar,
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
        label: "BCG TV",
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
    slug: "assessoria_imprensa",
    label: "Imprensa",
    icon: Newspaper,
    moduleSlug: "assessoria_imprensa",
    children: [
      {
        slug: "assessoria_imprensa_painel",
        label: DEPT_HUB_MENU_LABEL,
        href: "/dashboard/assessoria-imprensa",
        icon: LayoutDashboard,
        moduleSlug: "paginas",
        accessSlug: "assessoria_imprensa",
      },
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
      { slug: "socio_dashboard", label: DEPT_HUB_MENU_LABEL, href: "/dashboard/socio-torcedor", icon: LayoutDashboard, moduleSlug: "socio_torcedor" },
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
      { slug: "socio_socios", label: "Sócios", href: "/dashboard/socio-torcedor/socios", icon: Users, moduleSlug: "socio_torcedor" },
      hubRelatorio("socio_torcedor"),
    ],
  },
  {
    slug: "comunicacao",
    label: "Communication Center",
    icon: MessagesSquare,
    moduleSlug: "comunicacao",
    children: [
      {
        slug: "com_dash",
        label: DEPT_HUB_MENU_LABEL,
        href: "/dashboard/comunicacao",
        icon: LayoutDashboard,
        moduleSlug: "comunicacao",
      },
      {
        slug: "com_inbox",
        label: "Inbox",
        href: "/dashboard/comunicacao/inbox",
        icon: MessageCircle,
        moduleSlug: "comunicacao",
      },
      {
        slug: "com_canais",
        label: "Canais",
        href: "/dashboard/comunicacao/canais",
        icon: Cable,
        moduleSlug: "comunicacao",
      },
      {
        slug: "com_templates",
        label: "Templates",
        href: "/dashboard/comunicacao/templates",
        icon: FileText,
        moduleSlug: "comunicacao",
      },
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
      {
        slug: "fmf_scraper",
        label: "Importação FMF",
        href: "/dashboard/ferramentas/fmf-scraper",
        icon: Database,
        moduleSlug: "fmf_scraper",
      },
      {
        slug: "beatscode_import",
        label: "Importação Beatscode",
        href: "/dashboard/ferramentas/beatscode-import",
        icon: Users,
        moduleSlug: "fmf_scraper",
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
        slug: "config_perfis",
        label: "Perfis",
        href: "/dashboard/configuracoes/roles",
        icon: Shield,
        moduleSlug: "configuracoes",
        superAdminOnly: true,
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

/** Catálogo de permissões por item de menu (+ módulos só de API). */
export function getMenuAccessCatalog(): MenuAccessCatalogEntry[] {
  const bySlug = new Map<string, MenuAccessCatalogEntry>();
  let sortOrder = 0;

  function addEntry(slug: string, name: string, moduleSlug: string, accessGroup?: string) {
    if (bySlug.has(slug)) return;
    const displayName =
      slug.startsWith("group_") && accessGroup
        ? (ACCESS_GROUP_LABELS[accessGroup] ?? name)
        : name;
    const impliesSlug = slug.startsWith("group_") ? undefined : moduleSlug !== slug ? moduleSlug : undefined;
    bySlug.set(slug, {
      slug,
      name: displayName,
      moduleSlug,
      sortOrder: sortOrder++,
      impliesSlug,
    });
  }

  function walk(items: MenuItemConfig[], pathPrefix: string) {
    for (const item of items) {
      if (item.children?.length) {
        walk(item.children, `${pathPrefix}/${item.slug}`);
      } else if (item.href && !item.external) {
        const slug = resolveMenuAccessSlug(item, pathPrefix);
        addEntry(slug, item.label, item.moduleSlug, item.accessGroup);
      }
    }
  }

  for (const top of DASHBOARD_MENU) {
    if (top.children?.length) {
      walk(top.children, top.slug);
    } else if (top.href && !top.external) {
      addEntry(resolveMenuAccessSlug(top, top.slug), top.label, top.moduleSlug, top.accessGroup);
    }
  }

  for (const tab of PLAYER_TABS) {
    if (!tab.moduleSlug) continue;
    addEntry(`player_tab__${tab.id}`, `${DASHBOARD_LABELS.atletas} — ${tab.label}`, tab.moduleSlug);
  }

  for (const extra of API_ONLY_MODULE_SLUGS) {
    addEntry(extra.slug, extra.name, extra.slug);
  }

  return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

const API_ONLY_MODULE_SLUGS: Array<{ slug: string; name: string }> = [
  { slug: "agenda", name: "Agenda (hub)" },
  { slug: "vault_manage", name: "Senhas / Vault (gerenciar)" },
  { slug: "vault_reveal", name: "Senhas / Vault (revelar/copiar)" },
  { slug: "vault_export", name: "Senhas / Vault (exportar)" },
  { slug: "integracoes", name: "Integrações" },
  { slug: "psicologia", name: "Psicologia — legado auditoria" },
  { slug: "medico", name: "Médico — legado auditoria" },
  { slug: "analista", name: "Analista" },
];

/** Catálogo para sync com a API. */
export function buildModuleCatalog(names?: Record<string, string>): Array<{
  slug: string;
  name: string;
  sortOrder: number;
  impliesSlug?: string;
}> {
  return getMenuAccessCatalog().map((e) => ({
    slug: e.slug,
    name: names?.[e.slug] ?? e.name,
    sortOrder: e.sortOrder,
    ...(e.impliesSlug ? { impliesSlug: e.impliesSlug } : {}),
  }));
}

/** Slugs únicos do catálogo de acessos (sync + matriz). */
export function getUniqueModuleSlugs(): string[] {
  return getMenuAccessCatalog().map((e) => e.slug);
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
  /** Slug de permissão (folhas) — individual ou group_* */
  accessSlug?: string;
  accessGroup?: string;
  moduleSlug?: string;
  menuSlug?: string;
  href?: string;
  children: MenuAccessTreeNode[];
}

/** Coleta accessSlug das folhas de um nó. */
export function collectTreeAccessSlugs(node: MenuAccessTreeNode): string[] {
  if (node.kind === "leaf" && node.accessSlug) return [node.accessSlug];
  return node.children.flatMap(collectTreeAccessSlugs);
}

/** @deprecated Use collectTreeAccessSlugs */
export function collectTreeModuleSlugs(node: MenuAccessTreeNode): string[] {
  return collectTreeAccessSlugs(node);
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
      const accessSlug = resolveMenuAccessSlug(item, pathPrefix);
      nodes.push({
        id,
        label: item.label,
        kind: "leaf",
        accessSlug,
        accessGroup: item.accessGroup,
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
        accessSlug: resolveMenuAccessSlug(top, top.slug),
        accessGroup: top.accessGroup,
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
    const accessSlug = `player_tab__${tab.id}`;
    playerChildren.push({
      id: `player_tabs/${tab.id}`,
      label: tab.label,
      kind: "leaf",
      accessSlug,
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

    function walk(items: MenuItemConfig[], pathPrefix: string) {
      for (const item of items) {
        if (item.children?.length) {
          walk(item.children, `${pathPrefix}/${item.slug}`);
        } else if (item.href && !item.external) {
          addLabel(resolveMenuAccessSlug(item, pathPrefix), item.label);
        }
      }
    }

    if (top.children?.length) {
      walk(top.children, top.slug);
    } else if (top.href && !top.external) {
      addLabel(resolveMenuAccessSlug(top, top.slug), top.label);
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
    const slug = `player_tab__${tab.id}`;
    const list = playerBySlug.get(slug) ?? [];
    if (!list.includes(tab.label)) list.push(tab.label);
    playerBySlug.set(slug, list);
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
