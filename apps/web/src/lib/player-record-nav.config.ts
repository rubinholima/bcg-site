import type { PlayerTabConfig } from "@/lib/dashboard-menu.config";

/** Agrupamento visual das abas da ficha do atleta — sem alterar ids, rotas nem RBAC. */
export const PLAYER_TAB_GROUPS: {
  id: string;
  label: string;
  tabIds: string[];
}[] = [
  { id: "visao_geral", label: "Visão Geral", tabIds: ["mapa", "status"] },
  { id: "cadastro", label: "Cadastro", tabIds: ["dados", "imagens"] },
  {
    id: "saude",
    label: "Saúde",
    tabIds: ["psicologica", "fisioterapia", "enfermaria", "saidas_medicas", "nutricao"],
  },
  { id: "performance", label: "Performance", tabIds: ["fisiologia", "desempenho"] },
  {
    id: "futebol",
    label: "Futebol",
    tabIds: ["captacao", "treinos", "estatisticas", "assistencia_social"],
  },
  { id: "historico", label: "Histórico", tabIds: ["momentos"] },
];

export type PlayerTabGroupNav = {
  id: string;
  label: string;
  tabs: PlayerTabConfig[];
};

export function buildPlayerTabGroups(
  allTabs: PlayerTabConfig[],
  canAccessTab: (tab: PlayerTabConfig) => boolean,
): PlayerTabGroupNav[] {
  const visibleById = new Map(
    allTabs.filter(canAccessTab).map((tab) => [tab.id, tab] as const),
  );

  return PLAYER_TAB_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    tabs: group.tabIds
      .map((id) => visibleById.get(id))
      .filter((tab): tab is PlayerTabConfig => Boolean(tab)),
  })).filter((group) => group.tabs.length > 0);
}

export function findPlayerTabGroup(
  groups: PlayerTabGroupNav[],
  tabId: string,
): PlayerTabGroupNav | undefined {
  return groups.find((group) => group.tabs.some((tab) => tab.id === tabId));
}

export function resolvePlayerTabInGroups(
  groups: PlayerTabGroupNav[],
  tabId: string,
): string {
  if (groups.some((g) => g.tabs.some((t) => t.id === tabId))) return tabId;
  return groups[0]?.tabs[0]?.id ?? tabId;
}
