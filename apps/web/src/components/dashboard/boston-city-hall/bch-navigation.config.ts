import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  ContactRound,
  FileSignature,
  FileText,
  FlaskConical,
  Kanban,
  LayoutDashboard,
  ListChecks,
  Receipt,
  Settings2,
  ShoppingCart,
  Tags,
  Ticket,
  TrendingUp,
  Wallet,
  Wine,
} from "lucide-react";

/** Base canônica do módulo Boston City Hall no dashboard. */
export const BCH_BASE = "/dashboard/eventos/boston-city-hall";

export type BchNavGroupId =
  | "overview"
  | "commercial"
  | "events"
  | "revenue"
  | "bar"
  | "settings";

export type BchNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Oculto do menu principal (ex.: checkout de teste); ainda listado em rotas. */
  devOnly?: boolean;
  /** Correspondência exata (hub). */
  exact?: boolean;
};

export type BchNavGroup = {
  id: BchNavGroupId;
  label: string;
  items: BchNavItem[];
};

/** Navegação BCH — única fonte para subnav, breadcrumbs e títulos de página. */
export const BCH_NAV_GROUPS: BchNavGroup[] = [
  {
    id: "overview",
    label: "Visão geral",
    items: [
      { href: BCH_BASE, label: "Painel operacional", icon: LayoutDashboard, exact: true },
      { href: `${BCH_BASE}/executive`, label: "Executivo", icon: TrendingUp },
      { href: `${BCH_BASE}/alerts`, label: "Alertas operacionais", icon: Bell },
    ],
  },
  {
    id: "commercial",
    label: "Comercial",
    items: [
      { href: `${BCH_BASE}/crm`, label: "Leads", icon: ContactRound },
      { href: `${BCH_BASE}/pipeline`, label: "Funil", icon: Kanban },
      { href: `${BCH_BASE}/propostas`, label: "Propostas", icon: FileText },
      { href: `${BCH_BASE}/contratos`, label: "Contratos", icon: FileSignature },
    ],
  },
  {
    id: "events",
    label: "Eventos",
    items: [
      { href: `${BCH_BASE}/agenda`, label: "Agenda", icon: CalendarDays },
      { href: `${BCH_BASE}/reservas`, label: "Reservas", icon: ClipboardList },
      { href: `${BCH_BASE}/operacao`, label: "Operação", icon: ListChecks },
      { href: `${BCH_BASE}/ticketing`, label: "Ingressos", icon: Ticket },
    ],
  },
  {
    id: "revenue",
    label: "Receita",
    items: [{ href: `${BCH_BASE}/financeiro`, label: "Financeiro", icon: Wallet }],
  },
  {
    id: "bar",
    label: "Bar",
    items: [
      { href: `${BCH_BASE}/bar`, label: "Cadastro", icon: Wine },
      { href: `${BCH_BASE}/bar/dashboard`, label: "Painel", icon: BarChart3 },
      { href: `${BCH_BASE}/bar/pos`, label: "POS", icon: ShoppingCart },
      { href: `${BCH_BASE}/bar/event-inventory`, label: "Estoque de evento", icon: Wine },
      { href: `${BCH_BASE}/bar/physical-counts`, label: "Contagem física", icon: ClipboardList },
      { href: `${BCH_BASE}/bar/reports`, label: "Relatórios", icon: FileText },
      { href: `${BCH_BASE}/bar/close`, label: "Fechamento", icon: Receipt },
    ],
  },
  {
    id: "settings",
    label: "Configurações",
    items: [
      { href: `${BCH_BASE}/espacos`, label: "Espaços", icon: Building2 },
      { href: `${BCH_BASE}/servicos`, label: "Serviços", icon: Tags },
      {
        href: `${BCH_BASE}/ticketing?tab=checkout`,
        label: "Checkout (teste)",
        icon: FlaskConical,
        devOnly: true,
      },
    ],
  },
];

/** Rotas internas registradas (inclui dinâmicas) — para validação de cobertura. */
export const BCH_INTERNAL_ROUTE_PATTERNS = [
  BCH_BASE,
  `${BCH_BASE}/agenda`,
  `${BCH_BASE}/crm`,
  `${BCH_BASE}/pipeline`,
  `${BCH_BASE}/reservas`,
  `${BCH_BASE}/operacao`,
  `${BCH_BASE}/operacao/:bookingId`,
  `${BCH_BASE}/executive`,
  `${BCH_BASE}/alerts`,
  `${BCH_BASE}/ticketing`,
  `${BCH_BASE}/espacos`,
  `${BCH_BASE}/servicos`,
  `${BCH_BASE}/bar`,
  `${BCH_BASE}/bar/dashboard`,
  `${BCH_BASE}/bar/pos`,
  `${BCH_BASE}/bar/event-inventory`,
  `${BCH_BASE}/bar/physical-counts`,
  `${BCH_BASE}/bar/reports`,
  `${BCH_BASE}/bar/close`,
  `${BCH_BASE}/propostas`,
  `${BCH_BASE}/propostas/:id`,
  `${BCH_BASE}/contratos`,
  `${BCH_BASE}/contratos/:id`,
  `${BCH_BASE}/financeiro`,
  `${BCH_BASE}/financeiro/:id`,
  `${BCH_BASE}/eventos/:eventId/financeiro`,
  `${BCH_BASE}/ticketing?tab=checkout`,
] as const;

type BchPageMeta = {
  group: BchNavGroup | null;
  pageTitle: string;
  breadcrumbs: { href?: string; label: string }[];
};

function stripQuery(pathname: string): string {
  return pathname.split("?")[0] ?? pathname;
}

function matchNavItem(pathname: string, item: BchNavItem): boolean {
  const path = stripQuery(pathname);
  const hrefPath = stripQuery(item.href);
  if (item.exact) return path === hrefPath;
  return path === hrefPath || path.startsWith(`${hrefPath}/`);
}

export function resolveBchPageMeta(pathname: string, titleOverride?: string): BchPageMeta {
  const path = stripQuery(pathname);

  for (const group of BCH_NAV_GROUPS) {
    for (const item of group.items) {
      if (matchNavItem(path, item)) {
        return {
          group,
          pageTitle: titleOverride ?? item.label,
          breadcrumbs: [
            { href: "/dashboard/eventos", label: "Depto de Eventos" },
            { href: BCH_BASE, label: "Boston City Hall" },
            { href: stripQuery(item.href), label: group.label },
            { label: titleOverride ?? item.label },
          ],
        };
      }
    }
  }

  const dynamicRules: { test: RegExp; groupId: BchNavGroupId; title: string; parentHref: string; parentLabel: string }[] = [
    {
      test: /^\/dashboard\/eventos\/boston-city-hall\/operacao\/[^/]+$/,
      groupId: "events",
      title: "Detalhe da operação",
      parentHref: `${BCH_BASE}/operacao`,
      parentLabel: "Operação",
    },
    {
      test: /^\/dashboard\/eventos\/boston-city-hall\/propostas\/[^/]+$/,
      groupId: "commercial",
      title: "Proposta",
      parentHref: `${BCH_BASE}/propostas`,
      parentLabel: "Propostas",
    },
    {
      test: /^\/dashboard\/eventos\/boston-city-hall\/contratos\/[^/]+$/,
      groupId: "commercial",
      title: "Contrato",
      parentHref: `${BCH_BASE}/contratos`,
      parentLabel: "Contratos",
    },
    {
      test: /^\/dashboard\/eventos\/boston-city-hall\/financeiro\/[^/]+$/,
      groupId: "revenue",
      title: "Recebível",
      parentHref: `${BCH_BASE}/financeiro`,
      parentLabel: "Financeiro",
    },
    {
      test: /^\/dashboard\/eventos\/boston-city-hall\/eventos\/[^/]+\/financeiro$/,
      groupId: "revenue",
      title: "Resultado financeiro",
      parentHref: `${BCH_BASE}/financeiro`,
      parentLabel: "Financeiro",
    },
    {
      test: /^\/dashboard\/eventos\/boston-city-hall\/eventos\/[^/]+\/setup$/,
      groupId: "events",
      title: "Preparar evento",
      parentHref: `${BCH_BASE}/ticketing`,
      parentLabel: "Ingressos",
    },
  ];

  for (const rule of dynamicRules) {
    if (rule.test.test(path)) {
      const group = BCH_NAV_GROUPS.find((g) => g.id === rule.groupId) ?? null;
      const pageTitle = titleOverride ?? rule.title;
      return {
        group,
        pageTitle,
        breadcrumbs: [
          { href: "/dashboard/eventos", label: "Depto de Eventos" },
          { href: BCH_BASE, label: "Boston City Hall" },
          { href: rule.parentHref, label: rule.parentLabel },
          { label: pageTitle },
        ],
      };
    }
  }

  return {
    group: null,
    pageTitle: titleOverride ?? "Boston City Hall",
    breadcrumbs: [
      { href: "/dashboard/eventos", label: "Depto de Eventos" },
      { label: titleOverride ?? "Boston City Hall" },
    ],
  };
}

export function isBchNavItemActive(pathname: string, item: BchNavItem): boolean {
  const path = stripQuery(pathname);
  const hrefPath = stripQuery(item.href);
  if (item.exact) return path === hrefPath;
  if (path === hrefPath) return true;
  if (path.startsWith(`${hrefPath}/`)) return true;
  if (hrefPath === `${BCH_BASE}/ticketing` && path.startsWith(`${BCH_BASE}/ticketing`)) return true;
  if (
    hrefPath === `${BCH_BASE}/ticketing` &&
    /^\/dashboard\/eventos\/boston-city-hall\/eventos\/[^/]+\/setup$/.test(path)
  ) {
    return true;
  }
  return false;
}

export function bchNavGroupsForMenu(showDevItems: boolean): BchNavGroup[] {
  if (showDevItems) return BCH_NAV_GROUPS;
  return BCH_NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.devOnly),
  }));
}
