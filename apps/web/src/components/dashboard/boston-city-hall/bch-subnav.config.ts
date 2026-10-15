import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";

export type BchSubNavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

export const BCH_COMMERCIAL_SUBNAV: BchSubNavItem[] = [
  { href: `${BCH_BASE}/crm`, label: "Leads", exact: true },
  { href: `${BCH_BASE}/pipeline`, label: "Funil" },
  { href: `${BCH_BASE}/propostas`, label: "Propostas" },
  { href: `${BCH_BASE}/contratos`, label: "Contratos" },
];

export const BCH_BAR_SUBNAV: BchSubNavItem[] = [
  { href: `${BCH_BASE}/bar/dashboard`, label: "Painel", exact: true },
  { href: `${BCH_BASE}/bar`, label: "Cadastro" },
  { href: `${BCH_BASE}/bar/pos`, label: "POS" },
  { href: `${BCH_BASE}/bar/event-inventory`, label: "Estoque de evento" },
  { href: `${BCH_BASE}/bar/physical-counts`, label: "Contagem física" },
  { href: `${BCH_BASE}/bar/reports`, label: "Relatórios" },
  { href: `${BCH_BASE}/bar/close`, label: "Fechamento" },
];

export const BCH_TICKETING_SUBNAV: BchSubNavItem[] = [
  { href: `${BCH_BASE}/ticketing`, label: "Hub", exact: true },
  { href: `${BCH_BASE}/compradores`, label: "Compradores" },
];
