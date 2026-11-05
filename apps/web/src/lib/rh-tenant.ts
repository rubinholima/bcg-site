/** ID do tenant em registros RH — tolera relação ausente (tenant removido). */
export function rhRecordTenantId(row: {
  tenant?: { id: string } | null;
  tenantId?: string | null;
}): string | null {
  return row.tenant?.id ?? row.tenantId ?? null;
}

export function rhRecordTenantName(row: {
  tenant?: { id: string; name?: string } | null;
}): string {
  return row.tenant?.name ?? "—";
}
