export function formatNursingExemptFromTraining(value: boolean | null | undefined): string {
  if (value === true) return "Isento do treino";
  if (value === false) return "Participa do treino";
  return "—";
}
