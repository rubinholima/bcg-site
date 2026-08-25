/**
 * Vencimento de contrato (Beatscode type `contract` ou título equivalente)
 * é informação de gestão — não entra na programação semanal operacional.
 */
export function isContractExpirationAgendaItem(item: {
  externalId?: string | null;
  title?: string | null;
  type?: string | null;
}): boolean {
  const externalId = item.externalId?.trim().toLowerCase() ?? '';
  if (externalId.startsWith('beatscode-contract-')) return true;

  const title = item.title?.trim().toLowerCase() ?? '';
  if (!title) return false;

  if (/vencimento\s+(de\s+)?contrato/.test(title)) return true;
  if (/contrato\s+(venc|a vencer|vencendo)/.test(title)) return true;
  if (/fim\s+(de\s+)?contrato/.test(title)) return true;
  if (/t[eé]rmino\s+(de\s+)?contrato/.test(title)) return true;
  if (/renova[cç][aã]o\s+(de\s+)?contrato/.test(title)) return true;

  return false;
}
