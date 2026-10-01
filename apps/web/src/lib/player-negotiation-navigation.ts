const NEGOCIADOS_BASE = "/dashboard/cadastros/jogadores/negociados";

export function negociadosListHref(tenantId?: string | null): string {
  const id = tenantId?.trim();
  if (!id) return NEGOCIADOS_BASE;
  return `${NEGOCIADOS_BASE}?tenantId=${encodeURIComponent(id)}`;
}

export function negociadosNovaHref(options?: {
  tenantId?: string | null;
  playerId?: string | null;
}): string {
  const params = new URLSearchParams();
  const tenantId = options?.tenantId?.trim();
  const playerId = options?.playerId?.trim();
  if (tenantId) params.set("tenantId", tenantId);
  if (playerId) params.set("playerId", playerId);
  const q = params.toString();
  return q ? `${NEGOCIADOS_BASE}/nova?${q}` : `${NEGOCIADOS_BASE}/nova`;
}

export function negociadosEditarHref(negotiationId: string): string {
  return `${NEGOCIADOS_BASE}/${encodeURIComponent(negotiationId)}/editar`;
}
