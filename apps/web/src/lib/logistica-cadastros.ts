import { api } from "@/lib/api";

export interface LogisticsLookupRow {
  id: string;
  name: string;
  isSystem?: boolean;
  active?: boolean;
  sortOrder?: number;
  capacity?: number;
  birthDate?: string | null;
  phone?: string | null;
  rg?: string | null;
  rgIssuer?: string | null;
  cpf?: string | null;
  passport?: string | null;
  passportExpiry?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  transportCompany?: { id: string; name: string } | null;
  transportCompanyId?: string | null;
  category?: { id: string; name: string } | null;
  categoryId?: string | null;
  expenseCategory?: { id: string; name: string } | null;
  expenseCategoryId?: string | null;
  code?: string | null;
  guestType?: string | null;
  contactName?: string | null;
  document?: string | null;
  email?: string | null;
}

const BASE = "/logistica-cadastros";

export async function fetchLogisticaCadastroList(
  apiPath: string,
  params?: { tenantId?: string; search?: string; activeOnly?: boolean },
): Promise<LogisticsLookupRow[]> {
  const qs = new URLSearchParams();
  if (params?.tenantId) qs.set("tenantId", params.tenantId);
  if (params?.search?.trim()) qs.set("search", params.search.trim());
  if (params?.activeOnly) qs.set("activeOnly", "true");
  const query = qs.toString();
  const path = `${BASE}/${apiPath}${query ? `?${query}` : ""}`;
  const { data } = await api.get<LogisticsLookupRow[]>(path);
  return Array.isArray(data) ? data : [];
}

export async function fetchLogisticaCadastroOne(
  apiPath: string,
  id: string,
): Promise<LogisticsLookupRow | null> {
  try {
    const { data } = await api.get<LogisticsLookupRow>(`${BASE}/${apiPath}/${id}`);
    return data ?? null;
  } catch {
    return null;
  }
}

export function formatCadastroDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
