import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  ListTodo,
  ShoppingCart,
  Ticket,
  Users,
  Wallet,
  Wine,
} from "lucide-react";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";

/** Destinos principais do produto BCH (navegação de primeiro nível). */
export type BchAppDestinationId =
  | "overview"
  | "events"
  | "calendar"
  | "commercial"
  | "ticketing"
  | "bar"
  | "operations"
  | "finance"
  | "reports";

export type BchAppDestination = {
  id: BchAppDestinationId;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Preparado para RBAC fino (Fase 2) — hoje todos visíveis com módulo eventos. */
  rolesHint?: string[];
  exact?: boolean;
};

export const BCH_APP_DESTINATIONS: BchAppDestination[] = [
  {
    id: "overview",
    label: "Visão Geral",
    href: BCH_BASE,
    icon: LayoutDashboard,
    exact: true,
    rolesHint: ["general_manager"],
  },
  {
    id: "events",
    label: "Eventos",
    href: `${BCH_BASE}/eventos`,
    icon: ListTodo,
    rolesHint: ["event_coordinator", "general_manager"],
  },
  {
    id: "calendar",
    label: "Calendário",
    href: `${BCH_BASE}/agenda`,
    icon: CalendarDays,
    rolesHint: ["event_coordinator"],
  },
  {
    id: "commercial",
    label: "Comercial",
    href: `${BCH_BASE}/crm`,
    icon: ClipboardList,
    rolesHint: ["general_manager"],
  },
  {
    id: "ticketing",
    label: "Bilheteria e Entrada",
    href: `${BCH_BASE}/ticketing`,
    icon: Ticket,
    rolesHint: ["box_office_operator", "checkin_operator"],
  },
  {
    id: "bar",
    label: "Bar e Estoque",
    href: `${BCH_BASE}/bar/dashboard`,
    icon: Wine,
    rolesHint: ["bar_manager", "pos_operator"],
  },
  {
    id: "operations",
    label: "Equipe e Operação",
    href: `${BCH_BASE}/operacao`,
    icon: Users,
    rolesHint: ["event_coordinator"],
  },
  {
    id: "finance",
    label: "Financeiro",
    href: `${BCH_BASE}/financeiro`,
    icon: Wallet,
    rolesHint: ["general_manager"],
  },
  {
    id: "reports",
    label: "Relatórios",
    href: `${BCH_BASE}/executive`,
    icon: BarChart3,
    rolesHint: ["general_manager"],
  },
];

/** Atalhos secundários (cadastros bar, POS) — acessíveis pelos módulos existentes. */
export const BCH_APP_SECONDARY_LINKS = [
  { label: "Cadastro bar", href: `${BCH_BASE}/bar`, icon: ShoppingCart },
  { label: "POS", href: `${BCH_BASE}/bar/pos`, icon: ShoppingCart },
] as const;

export function bchEventWorkspacePath(eventId: string): string {
  return `${BCH_BASE}/eventos/${encodeURIComponent(eventId)}`;
}

export function isBchAppDestinationActive(pathname: string, dest: BchAppDestination): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  if (dest.exact) return path === dest.href;
  if (path === dest.href) return true;
  if (dest.id === "events" && /^\/dashboard\/eventos\/boston-city-hall\/eventos(\/|$)/.test(path)) {
    return true;
  }
  if (dest.id === "ticketing") {
    if (path.startsWith(`${BCH_BASE}/ticketing`)) return true;
    if (/^\/dashboard\/eventos\/boston-city-hall\/eventos\/[^/]+\/setup$/.test(path)) return false;
  }
  return path.startsWith(`${dest.href}/`);
}

export function resolveBchAppSectionLabel(pathname: string): string {
  const path = pathname.split("?")[0] ?? pathname;
  const dest = BCH_APP_DESTINATIONS.find((d) => isBchAppDestinationActive(path, d));
  if (dest) return dest.label;
  if (/^\/dashboard\/eventos\/boston-city-hall\/eventos\/[^/]+$/.test(path)) return "Centro do evento";
  return "Boston City Hall";
}
