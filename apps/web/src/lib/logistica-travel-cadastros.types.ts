export interface LogisticsTravelCadastros {
  hotelId?: string | null;
  transportCompanyId?: string | null;
  usageMomentId?: string | null;
  loyaltyProgramId?: string | null;
  paymentTypeId?: string | null;
  destinationId?: string | null;
  departureAirportId?: string | null;
  arrivalAirportId?: string | null;
  supplierId?: string | null;
}

export interface LogisticsExpenseLine {
  id: string;
  expenseCategoryId?: string | null;
  serviceProductId?: string | null;
  supplierId?: string | null;
  paymentTypeId?: string | null;
  description?: string;
  amount?: number | null;
}

const CADASTRO_KEYS: (keyof LogisticsTravelCadastros)[] = [
  "hotelId",
  "transportCompanyId",
  "usageMomentId",
  "loyaltyProgramId",
  "paymentTypeId",
  "destinationId",
  "departureAirportId",
  "arrivalAirportId",
  "supplierId",
];

function pickId(o: Record<string, unknown>, key: string): string | null {
  const v = o[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function parseLogisticsTravelCadastros(
  beatscodeMeta: unknown,
): LogisticsTravelCadastros {
  if (!beatscodeMeta || typeof beatscodeMeta !== "object") return {};
  const raw = (beatscodeMeta as { logisticsCadastros?: unknown }).logisticsCadastros;
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: LogisticsTravelCadastros = {};
  for (const key of CADASTRO_KEYS) {
    out[key] = pickId(o, key);
  }
  return out;
}

export function parseLogisticsExpenseLines(beatscodeMeta: unknown): LogisticsExpenseLine[] {
  if (!beatscodeMeta || typeof beatscodeMeta !== "object") return [];
  const raw = (beatscodeMeta as { expenseLines?: unknown }).expenseLines;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row, i) => ({
      id: typeof row.id === "string" && row.id ? row.id : `line-${i}`,
      expenseCategoryId: pickId(row, "expenseCategoryId"),
      serviceProductId: pickId(row, "serviceProductId"),
      supplierId: pickId(row, "supplierId"),
      paymentTypeId: pickId(row, "paymentTypeId"),
      description: typeof row.description === "string" ? row.description : "",
      amount:
        typeof row.amount === "number" && Number.isFinite(row.amount)
          ? row.amount
          : typeof row.amount === "string" && row.amount.trim()
            ? Number(row.amount.replace(",", "."))
            : null,
    }));
}

export function parsePointOfInterestIds(beatscodeMeta: unknown): string[] {
  if (!beatscodeMeta || typeof beatscodeMeta !== "object") return [];
  const raw = (beatscodeMeta as { pointOfInterestIds?: unknown }).pointOfInterestIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && !!id.trim());
}

export function createExpenseLineId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `exp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const EMPTY_LOGISTICS_TRAVEL_CADASTROS: LogisticsTravelCadastros = {
  hotelId: null,
  transportCompanyId: null,
  usageMomentId: null,
  loyaltyProgramId: null,
  paymentTypeId: null,
  destinationId: null,
  departureAirportId: null,
  arrivalAirportId: null,
  supplierId: null,
};
