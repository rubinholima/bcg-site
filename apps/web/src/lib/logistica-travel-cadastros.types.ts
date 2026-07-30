export interface LogisticsTravelCadastros {
  hotelId?: string | null;
  transportCompanyId?: string | null;
  usageMomentId?: string | null;
  loyaltyProgramId?: string | null;
  paymentTypeId?: string | null;
}

export function parseLogisticsTravelCadastros(
  beatscodeMeta: unknown,
): LogisticsTravelCadastros {
  if (!beatscodeMeta || typeof beatscodeMeta !== "object") return {};
  const raw = (beatscodeMeta as { logisticsCadastros?: unknown }).logisticsCadastros;
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const pick = (key: keyof LogisticsTravelCadastros) => {
    const v = o[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return {
    hotelId: pick("hotelId"),
    transportCompanyId: pick("transportCompanyId"),
    usageMomentId: pick("usageMomentId"),
    loyaltyProgramId: pick("loyaltyProgramId"),
    paymentTypeId: pick("paymentTypeId"),
  };
}

export const EMPTY_LOGISTICS_TRAVEL_CADASTROS: LogisticsTravelCadastros = {
  hotelId: null,
  transportCompanyId: null,
  usageMomentId: null,
  loyaltyProgramId: null,
  paymentTypeId: null,
};
