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

export type TryoutBilateralSideField = "response" | "outcome";

export type PhysioTryoutValidationIssue = {
  focusId: string;
  message: string;
};

function sideMissing(
  tests: TryoutBilateralTests,
  key: TryoutClearanceTestKey,
  side: "right" | "left",
  field: TryoutBilateralSideField,
): boolean {
  const cell = tests[key][side];
  if (field === "response") return !cell.response?.trim();
  return cell.outcome !== "aprovado" && cell.outcome !== "reprovado";
}

/** Espelha regras obrigatórias do POST /fisioterapia/tryout-clearances */
export function validatePhysioTryoutClearanceForm(input: {
  tenantId: string;
  prospectId: string;
  staffId: string;
  staffName?: string | null;
  injuryHistory: string;
  manualStrengthTest: string;
  outcome: string;
  bilateralTests: TryoutBilateralTests;
}): PhysioTryoutValidationIssue[] {
  const issues: PhysioTryoutValidationIssue[] = [];

  if (!input.tenantId.trim()) {
    issues.push({ focusId: "tryout-field-clube", message: "Selecione o clube." });
  }
  if (!input.prospectId.trim()) {
    issues.push({ focusId: "tryout-field-atleta", message: "Selecione o atleta try-out." });
  }
  if (!input.staffId.trim() && !input.staffName?.trim()) {
    issues.push({
      focusId: "tryout-field-fisioterapeuta",
      message: "Selecione o fisioterapeuta avaliador.",
    });
  }
  if (!input.injuryHistory.trim()) {
    issues.push({
      focusId: "tryout-field-injury-history",
      message: "Informe o histórico de lesões.",
    });
  }
  if (!input.manualStrengthTest.trim()) {
    issues.push({
      focusId: "tryout-field-manual-strength",
      message: "Informe o teste de força muscular manual.",
    });
  }
  if (input.outcome !== "aprovado" && input.outcome !== "reprovado") {
    issues.push({
      focusId: "tryout-field-outcome",
      message: "Selecione o resultado final (aprovado ou reprovado).",
    });
  }

  for (const key of TRYOUT_CLEARANCE_TESTS) {
    for (const side of ["right", "left"] as const) {
      const sideLabel = side === "right" ? "Direita" : "Esquerda";
      const testLabel = TRYOUT_CLEARANCE_TEST_LABELS[key];
      if (sideMissing(input.bilateralTests, key, side, "response")) {
        issues.push({
          focusId: `tryout-test-${key}-${side}-response`,
          message: `${testLabel} (${sideLabel}): informe a resposta/nota.`,
        });
      }
      if (sideMissing(input.bilateralTests, key, side, "outcome")) {
        issues.push({
          focusId: `tryout-test-${key}-${side}-outcome`,
          message: `${testLabel} (${sideLabel}): selecione aprovado ou reprovado.`,
        });
      }
    }
  }

  return issues;
}

export function isPhysioTryoutClearanceFormComplete(
  input: Parameters<typeof validatePhysioTryoutClearanceForm>[0],
): boolean {
  return validatePhysioTryoutClearanceForm(input).length === 0;
}

export function isTryoutBilateralSideInvalid(
  tests: TryoutBilateralTests,
  key: TryoutClearanceTestKey,
  side: "right" | "left",
  showErrors: boolean,
): { response: boolean; outcome: boolean } {
  if (!showErrors) return { response: false, outcome: false };
  return {
    response: sideMissing(tests, key, side, "response"),
    outcome: sideMissing(tests, key, side, "outcome"),
  };
}
