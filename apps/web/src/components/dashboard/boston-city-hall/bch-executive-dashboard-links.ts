import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";

/**
 * Destinos verificados (rotas existentes em apps/web).
 * Filtros na URL só onde a página destino já lê searchParams.
 */
export const BCH_EXEC_KPI_LINKS = {
  /** Contagem = eventos de bilheteria com startDate hoje. */
  eventsToday: `${BCH_BASE}/eventos`,
  /** Lista de reservas — filtros de período/status são só na UI da página. */
  upcomingBookings: `${BCH_BASE}/reservas`,
  confirmedBookings: `${BCH_BASE}/reservas`,
  openOpportunities: `${BCH_BASE}/pipeline`,
  openReceivables: `${BCH_BASE}/financeiro`,
  operationalAlerts: `${BCH_BASE}/alerts`,
} as const;

export const BCH_EXEC_KPI_NAV_HINTS: Record<keyof typeof BCH_EXEC_KPI_LINKS, string> = {
  eventsToday: "Abre Eventos. A lista não filtra automaticamente por hoje.",
  upcomingBookings: "Abre Reservas. Use os filtros da página para período futuro.",
  confirmedBookings: "Abre Reservas. Use o filtro de status Confirmado na página.",
  openOpportunities: "Abre o funil comercial (Pipeline).",
  openReceivables: "Abre Financeiro. Filtros de saldo em aberto são na página.",
  operationalAlerts: "Abre alertas operacionais abertos.",
};

export const BCH_EXEC_PANEL_LINKS = {
  calendar: `${BCH_BASE}/agenda`,
  events: `${BCH_BASE}/eventos`,
  pipeline: `${BCH_BASE}/pipeline`,
  finance: `${BCH_BASE}/financeiro`,
  crm: `${BCH_BASE}/crm`,
  proposals: `${BCH_BASE}/propostas`,
  contracts: `${BCH_BASE}/contratos`,
  reports: `${BCH_BASE}/executive`,
  reservas: `${BCH_BASE}/reservas`,
  operacao: `${BCH_BASE}/operacao`,
} as const;

/** Funil — estágio não é parâmetro de URL hoje; sempre abre Pipeline. */
export function bchPipelineStageHref(_stage: string): string {
  return BCH_EXEC_PANEL_LINKS.pipeline;
}
