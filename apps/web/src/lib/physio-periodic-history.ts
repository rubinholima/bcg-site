import { PHYSIO_PROTOCOL_CLASSIFICATION_LABEL } from "@/lib/physio-periodic-labels";

export type PhysioHistoryDetailLine = {
  label: string;
  value: string;
  classification?: string | null;
};

const DIR_LABEL: Record<string, string> = {
  frontal: "Frontal",
  lateral: "Lateral",
  cruzado: "Cruzado",
  proximal: "Proximal",
  medial: "Medial",
  distal: "Distal",
  panturrilha: "Panturrilha",
};

function classificationLabel(value?: string | null): string | undefined {
  if (!value) return undefined;
  return PHYSIO_PROTOCOL_CLASSIFICATION_LABEL[value] ?? value;
}

function fmtNum(value: unknown): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : String(value);
}

function bilateralLine(
  label: string,
  absDiff: unknown,
  pct: unknown,
  classification?: string | null,
): PhysioHistoryDetailLine {
  const pctNum = Number(pct);
  const pctText = Number.isFinite(pctNum) ? pctNum.toFixed(1) : fmtNum(pct);
  return {
    label,
    value: `Δ ${fmtNum(absDiff)} · ${pctText}%`,
    classification,
  };
}

/** Formata payload persistido (incl. computed) para exibição no histórico do atleta. */
export function formatPeriodicTestHistory(
  protocol: string,
  payload: Record<string, unknown> | null | undefined,
): PhysioHistoryDetailLine[] {
  if (!payload) return [];

  const lines: PhysioHistoryDetailLine[] = [];
  const computed = payload.computed as Record<string, unknown> | undefined;

  switch (protocol) {
    case "y_balance": {
      const right = payload.right as Record<string, number> | undefined;
      const left = payload.left as Record<string, number> | undefined;
      if (right) {
        lines.push({
          label: "Direita",
          value: `F ${fmtNum(right.frontal)} · L ${fmtNum(right.lateral)} · C ${fmtNum(right.cruzado)}`,
        });
      }
      if (left) {
        lines.push({
          label: "Esquerda",
          value: `F ${fmtNum(left.frontal)} · L ${fmtNum(left.lateral)} · C ${fmtNum(left.cruzado)}`,
        });
      }
      const diffs = computed?.differences as Record<string, number> | undefined;
      const absDiffs = computed?.differencesAbs as Record<string, number> | undefined;
      const classes = computed?.classifications as Record<string, string> | undefined;
      if (diffs) {
        for (const [key, pct] of Object.entries(diffs)) {
          lines.push(bilateralLine(DIR_LABEL[key] ?? key, absDiffs?.[key], pct, classes?.[key]));
        }
      }
      break;
    }
    case "hop_test": {
      const rightJumps = payload.rightJumps as number[] | undefined;
      const leftJumps = payload.leftJumps as number[] | undefined;
      if (rightJumps?.length) {
        lines.push({ label: "Saltos D (cm)", value: rightJumps.map(fmtNum).join(" · ") });
      }
      if (leftJumps?.length) {
        lines.push({ label: "Saltos E (cm)", value: leftJumps.map(fmtNum).join(" · ") });
      }
      if (computed) {
        lines.push({
          label: "Melhor salto",
          value: `D ${fmtNum(computed.rightBest)} · E ${fmtNum(computed.leftBest)}`,
        });
        lines.push(
          bilateralLine(
            "Assimetria",
            computed.absDiff,
            computed.diffPct,
            (computed.overall as string | undefined) ?? null,
          ),
        );
      }
      break;
    }
    case "perimetria": {
      const right = payload.right as Record<string, number> | undefined;
      const left = payload.left as Record<string, number> | undefined;
      if (right) {
        lines.push({
          label: "Direita",
          value: `P ${fmtNum(right.proximal)} · M ${fmtNum(right.medial)} · D ${fmtNum(right.distal)}`,
        });
      }
      if (left) {
        lines.push({
          label: "Esquerda",
          value: `P ${fmtNum(left.proximal)} · M ${fmtNum(left.medial)} · D ${fmtNum(left.distal)}`,
        });
      }
      if (payload.calfRight != null || payload.calfLeft != null) {
        lines.push({
          label: "Panturrilha",
          value: `D ${fmtNum(payload.calfRight)} · E ${fmtNum(payload.calfLeft)}`,
        });
      }
      const pairs = computed?.pairs as
        | { key: string; diffPct: number; absDiff?: number; classification: string }[]
        | undefined;
      if (pairs?.length) {
        for (const pair of pairs) {
          lines.push(
            bilateralLine(
              DIR_LABEL[pair.key] ?? pair.key,
              pair.absDiff,
              pair.diffPct,
              pair.classification,
            ),
          );
        }
      }
      break;
    }
    case "t_test":
      lines.push({
        label: "Tempo",
        value: `${fmtNum(payload.seconds)} s`,
        classification: (payload.classification as string | undefined) ?? null,
      });
      break;
    case "stop_down": {
      lines.push({
        label: "Frontal",
        value: fmtNum(payload.frontal),
        classification: (computed?.frontal as string | undefined) ?? null,
      });
      lines.push({
        label: "Lateral",
        value: fmtNum(payload.lateral),
        classification: (computed?.lateral as string | undefined) ?? null,
      });
      break;
    }
    case "agachamento_bastao":
      lines.push({
        label: "Resultado",
        value: payload.approved === true ? "Aprovado" : payload.approved === false ? "Reprovado" : "—",
        classification: (payload.classification as string | undefined) ?? null,
      });
      break;
    case "forca_kinology":
      if (payload.pdfName) {
        lines.push({ label: "PDF", value: String(payload.pdfName) });
      }
      if (payload.pdfUrl) {
        lines.push({ label: "Arquivo", value: String(payload.pdfUrl) });
      }
      break;
    default:
      break;
  }

  return lines;
}

export function formatPeriodicTestClassification(
  classification?: string | null,
  score?: string | null,
): string {
  if (classification) return classificationLabel(classification) ?? classification;
  return score?.trim() || "—";
}
