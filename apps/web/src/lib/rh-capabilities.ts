import type { MeResponse } from "@/types/auth";

export type RhCapability =
  | "rh_view"
  | "rh_manage"
  | "rh_hiring_view"
  | "rh_hiring_manage"
  | "rh_compensation_view"
  | "rh_compensation_manage"
  | "rh_bank_view"
  | "rh_bank_manage"
  | "rh_private_docs_view"
  | "rh_private_docs_manage"
  | "rh_contracts_view"
  | "rh_contracts_manage";

const GRANULAR_MODULES: Record<RhCapability, string[]> = {
  rh_view: ["rh_view"],
  rh_manage: ["rh_manage"],
  rh_hiring_view: ["rh_hiring_view", "rh_hiring_manage"],
  rh_hiring_manage: ["rh_hiring_manage"],
  rh_compensation_view: ["rh_compensation_view", "rh_compensation_manage"],
  rh_compensation_manage: ["rh_compensation_manage"],
  rh_bank_view: ["rh_bank_view", "rh_bank_manage"],
  rh_bank_manage: ["rh_bank_manage"],
  rh_private_docs_view: ["rh_private_docs_view", "rh_private_docs_manage"],
  rh_private_docs_manage: ["rh_private_docs_manage"],
  rh_contracts_view: ["rh_contracts_view", "rh_contracts_manage"],
  rh_contracts_manage: ["rh_contracts_manage"],
};

export function hasRhCapability(
  modules: string[],
  capability: RhCapability,
  role?: MeResponse["role"] | null,
): boolean {
  if (role === "super_admin" || role === "company_admin") return true;
  if (modules.includes("adm_rh")) return true;
  const needed = GRANULAR_MODULES[capability];
  return needed.some((s) => modules.includes(s));
}
