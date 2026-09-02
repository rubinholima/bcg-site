export const TRYOUT_CLEARANCE_TESTS = [
  "squeeze_test",
  "askling_test",
  "lachman_test",
  "gaveta_anterior",
  "gaveta_posterior",
  "adm_joelho",
  "bocejo_lateral",
  "bocejo_medial",
  "compressao_apley",
  "sinal_lag",
] as const;

export type TryoutClearanceTestKey = (typeof TRYOUT_CLEARANCE_TESTS)[number];

export const TRYOUT_CLEARANCE_TEST_LABELS: Record<TryoutClearanceTestKey, string> = {
  squeeze_test: "Squeeze Test",
  askling_test: "Askling Test",
  lachman_test: "Lachman Test",
  gaveta_anterior: "Gaveta Anterior",
  gaveta_posterior: "Gaveta Posterior",
  adm_joelho: "ADM de Joelho",
  bocejo_lateral: "Bocejo Lateral",
  bocejo_medial: "Bocejo Medial",
  compressao_apley: "Compressão de Apley",
  sinal_lag: "Sinal de Lag",
};

export type TryoutSideResult = {
  response?: string;
  outcome?: "aprovado" | "reprovado";
};

export type TryoutBilateralTests = Record<
  TryoutClearanceTestKey,
  { right: TryoutSideResult; left: TryoutSideResult }
>;

export function emptyTryoutBilateralTests(): TryoutBilateralTests {
  const result = {} as TryoutBilateralTests;
  for (const key of TRYOUT_CLEARANCE_TESTS) {
    result[key] = { right: {}, left: {} };
  }
  return result;
}
