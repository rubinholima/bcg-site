"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import {
  REPORT_DIMENSIONS,
  SCOUTING_EVALUATION_OUTCOMES,
  SCOUTING_RATING_SCALE,
  RECOMMENDATIONS,
  type DimensionFormState,
} from "@/lib/captacao-types";

export type CaptacaoEvaluationFormValues = {
  scoutId: string;
  overallRating: string;
  evaluationOutcome: string;
  recommendation: string;
  needsLodging: "" | "sim" | "nao";
  presentationDate: string;
  strengths: string;
  weaknesses: string;
  scoutNotes: string;
};

export const EMPTY_EVALUATION_FORM: CaptacaoEvaluationFormValues = {
  scoutId: "",
  overallRating: "6",
  evaluationOutcome: "pendente",
  recommendation: "continuar",
  needsLodging: "",
  presentationDate: "",
  strengths: "",
  weaknesses: "",
  scoutNotes: "",
};

type ScoutOption = { id: string; name: string };

interface Props {
  scouts: ScoutOption[];
  values: CaptacaoEvaluationFormValues;
  dimensionEvals: DimensionFormState;
  onValuesChange: (next: CaptacaoEvaluationFormValues) => void;
  onDimensionEvalsChange: (next: DimensionFormState) => void;
  scoutRequired?: boolean;
}

export function CaptacaoEvaluationFields({
  scouts,
  values,
  dimensionEvals,
  onValuesChange,
  onDimensionEvalsChange,
  scoutRequired = true,
}: Props) {
  const set = (patch: Partial<CaptacaoEvaluationFormValues>) =>
    onValuesChange({ ...values, ...patch });

  return (
    <>
      <div>
        <Label>Captador{scoutRequired ? " *" : ""}</Label>
        <NativeSelectField
          value={values.scoutId || ""}
          onChange={(e) => set({ scoutId: e.target.value })}
          placeholder="Selecione…"
          required={scoutRequired}
          options={scouts.map((s) => ({ value: s.id, label: s.name }))}
        />
      </div>
      <div>
        <Label>Nota geral (0–10)</Label>
        <Input
          type="number"
          min={SCOUTING_RATING_SCALE.min}
          max={SCOUTING_RATING_SCALE.max}
          step={SCOUTING_RATING_SCALE.step}
          className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
          value={values.overallRating}
          onChange={(e) => set({ overallRating: e.target.value })}
        />
      </div>
      <div>
        <Label>Encaminhamento</Label>
        <NativeSelect
          className="text-foreground"
          value={values.evaluationOutcome}
          onChange={(e) => set({ evaluationOutcome: e.target.value })}
        >
          {SCOUTING_EVALUATION_OUTCOMES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div>
        <Label>Recomendação *</Label>
        <NativeSelect
          className="text-foreground"
          value={values.recommendation}
          onChange={(e) => set({ recommendation: e.target.value })}
        >
          {RECOMMENDATIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div>
        <Label>Precisa de alojamento?</Label>
        <NativeSelect
          className="text-foreground"
          value={values.needsLodging}
          onChange={(e) =>
            set({
              needsLodging: e.target.value as CaptacaoEvaluationFormValues["needsLodging"],
              presentationDate: e.target.value === "nao" ? values.presentationDate : "",
            })
          }
        >
          <option value="">—</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </NativeSelect>
      </div>
      {values.needsLodging === "nao" && values.evaluationOutcome === "aprovado" ? (
        <div>
          <Label>Data de apresentação *</Label>
          <Input
            type="date"
            required
            className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
            value={values.presentationDate}
            onChange={(e) => set({ presentationDate: e.target.value })}
          />
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <Label>Pontos fortes</Label>
        <Textarea
          className="text-foreground"
          value={values.strengths}
          onChange={(e) => set({ strengths: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <Label>Observação descritiva</Label>
        <Textarea
          className="text-foreground"
          rows={4}
          value={values.scoutNotes}
          onChange={(e) => set({ scoutNotes: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <p className="mb-3 text-sm font-semibold text-foreground">Aspectos (nota 0–10)</p>
        <div className="space-y-4">
          {Object.entries(REPORT_DIMENSIONS).map(([dimKey, dim]) => (
            <div key={dimKey} className="rounded-lg border border-border bg-card/30 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {dim.label}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {dim.areas.map((area) => (
                  <div key={area.key} className="space-y-1">
                    <Label className="text-xs">{area.label}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={SCOUTING_RATING_SCALE.min}
                        max={SCOUTING_RATING_SCALE.max}
                        step={SCOUTING_RATING_SCALE.step}
                        className="h-9 w-20 text-foreground"
                        placeholder="0–10"
                        value={dimensionEvals[dimKey]?.[area.key]?.rating ?? ""}
                        onChange={(e) =>
                          onDimensionEvalsChange({
                            ...dimensionEvals,
                            [dimKey]: {
                              ...dimensionEvals[dimKey],
                              [area.key]: {
                                ...dimensionEvals[dimKey]?.[area.key],
                                rating: e.target.value,
                              },
                            },
                          })
                        }
                      />
                      <Input
                        placeholder="Obs."
                        className="h-9 flex-1 text-foreground text-xs"
                        value={dimensionEvals[dimKey]?.[area.key]?.notes ?? ""}
                        onChange={(e) =>
                          onDimensionEvalsChange({
                            ...dimensionEvals,
                            [dimKey]: {
                              ...dimensionEvals[dimKey],
                              [area.key]: {
                                ...dimensionEvals[dimKey]?.[area.key],
                                notes: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <Label>Pontos a melhorar / riscos</Label>
        <Textarea
          className="text-foreground"
          value={values.weaknesses}
          onChange={(e) => set({ weaknesses: e.target.value })}
        />
      </div>
    </>
  );
}
