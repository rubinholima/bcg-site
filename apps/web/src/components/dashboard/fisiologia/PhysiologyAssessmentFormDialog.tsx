"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import {
  computeAgeAtDate,
  computeBmi,
  computeBodyFatPercent,
  computeCompositionStatus,
  computeLeanMassKg,
  COMPOSITION_STATUS_LABELS,
} from "@/lib/fisiologia-calculations";
import {
  ASSESSMENT_TYPES,
  COMPOSITION_STATUS_OPTIONS,
  EVALUATOR_ROLES,
  PHYSIOLOGY_PROTOCOLS,
  type PhysiologyAssessmentRow,
  type SkinfoldSites,
} from "@/lib/fisiologia-types";
import { getCategoryLabel } from "@/lib/fixture-categories";

export interface PhysiologyPlayerOption {
  id: string;
  name: string;
  jerseyNumber: number | null;
  category?: string | null;
  birthDate?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: PhysiologyPlayerOption[];
  edit?: PhysiologyAssessmentRow | null;
  onSuccess: () => void;
  defaultPlayerId?: string;
}

const SKINFOLD_FIELDS: Array<{ key: keyof SkinfoldSites; label: string }> = [
  { key: "se", label: "SE (subescapular)" },
  { key: "tr", label: "TR (tríceps)" },
  { key: "pe", label: "PE (peitoral)" },
  { key: "ax", label: "AX (axilar)" },
  { key: "si", label: "SI (supra-ilíaca)" },
  { key: "ab", label: "AB (abdominal)" },
  { key: "cx", label: "CX (coxa)" },
];

function parseNum(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function emptySkinfolds(): SkinfoldSites {
  return { se: null, tr: null, pe: null, ax: null, si: null, ab: null, cx: null };
}

export function PhysiologyAssessmentFormDialog({
  open,
  onOpenChange,
  players,
  edit,
  onSuccess,
  defaultPlayerId,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [assessmentType, setAssessmentType] = useState("rotina");
  const [assessedAt, setAssessedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [evaluatorRole, setEvaluatorRole] = useState("fisiologista");
  const [evaluatorName, setEvaluatorName] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [protocol, setProtocol] = useState("jackson_pollock_7");
  const [manualBodyFat, setManualBodyFat] = useState("");
  const [skinfolds, setSkinfolds] = useState<SkinfoldSites>(emptySkinfolds());
  const [vo2max, setVo2max] = useState("");
  const [cmjCm, setCmjCm] = useState("");
  const [illinoisSec, setIllinoisSec] = useState("");
  const [tTestSec, setTTestSec] = useState("");
  const [sprint10m, setSprint10m] = useState("");
  const [sprint20m, setSprint20m] = useState("");
  const [yoyoDistance, setYoyoDistance] = useState("");
  const [rastPower, setRastPower] = useState("");
  const [mobilityNotes, setMobilityNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === playerId) ?? null,
    [players, playerId],
  );

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setPlayerId(edit.playerId);
      setAssessmentType(edit.assessmentType ?? "rotina");
      setAssessedAt(edit.assessedAt.slice(0, 10));
      setEvaluatorRole(edit.evaluatorRole ?? "fisiologista");
      setEvaluatorName(edit.evaluatorName ?? "");
      setWeight(edit.weight != null ? String(edit.weight) : "");
      setHeight(edit.height != null ? String(edit.height) : "");
      setProtocol(edit.protocol ?? "jackson_pollock_7");
      setManualBodyFat(edit.bodyFatPercent != null ? String(edit.bodyFatPercent) : "");
      setSkinfolds({ ...emptySkinfolds(), ...(edit.skinfolds ?? {}) });
      setVo2max(edit.vo2max != null ? String(edit.vo2max) : "");
      setCmjCm(edit.cmjCm != null ? String(edit.cmjCm) : "");
      setIllinoisSec(edit.illinoisSec != null ? String(edit.illinoisSec) : "");
      setTTestSec(edit.tTestSec != null ? String(edit.tTestSec) : "");
      setSprint10m(edit.sprint10m != null ? String(edit.sprint10m) : "");
      setSprint20m(edit.sprint20m != null ? String(edit.sprint20m) : "");
      setYoyoDistance(edit.yoyoDistance != null ? String(edit.yoyoDistance) : "");
      setRastPower(edit.rastPower != null ? String(edit.rastPower) : "");
      setMobilityNotes(edit.mobilityNotes ?? "");
      setNotes(edit.notes ?? "");
    } else {
      setPlayerId(defaultPlayerId ?? "");
      setAssessmentType("rotina");
      setAssessedAt(new Date().toISOString().slice(0, 10));
      setEvaluatorRole("fisiologista");
      setEvaluatorName("");
      setWeight("");
      setHeight("");
      setProtocol("jackson_pollock_7");
      setManualBodyFat("");
      setSkinfolds(emptySkinfolds());
      setVo2max("");
      setCmjCm("");
      setIllinoisSec("");
      setTTestSec("");
      setSprint10m("");
      setSprint20m("");
      setYoyoDistance("");
      setRastPower("");
      setMobilityNotes("");
      setNotes("");
    }
  }, [open, edit, defaultPlayerId]);

  const computed = useMemo(() => {
    const w = parseNum(weight);
    const h = parseNum(height);
    const bmi = computeBmi(w, h);
    const at = assessedAt ? new Date(`${assessedAt}T12:00:00`) : new Date();
    const birthDate = selectedPlayer?.birthDate ?? null;
    const age = computeAgeAtDate(birthDate, at);
    const manualFat = parseNum(manualBodyFat);
    const bodyFatPercent = computeBodyFatPercent({
      protocol,
      skinfolds,
      ageYears: age.ageYears,
      manualPercent: manualFat,
    });
    const leanMassKg = computeLeanMassKg(w, bodyFatPercent);
    const compositionStatus = computeCompositionStatus(bodyFatPercent, age.ageYears);
    return { bmi, age, bodyFatPercent, leanMassKg, compositionStatus };
  }, [weight, height, assessedAt, selectedPlayer, manualBodyFat, protocol, skinfolds]);

  const setSkinfold = (key: keyof SkinfoldSites, value: string) => {
    setSkinfolds((prev) => ({ ...prev, [key]: parseNum(value) }));
  };

  const handleSave = async () => {
    if (!playerId) {
      setFeedback({ open: true, title: "Atenção", message: "Selecione o atleta." });
      return;
    }
    if (!assessedAt) {
      setFeedback({ open: true, title: "Atenção", message: "Informe a data da avaliação." });
      return;
    }
    setSaving(true);
    try {
      const w = parseNum(weight);
      const payload = {
        playerId,
        category: selectedPlayer?.category ?? undefined,
        assessmentType,
        assessedAt,
        evaluatorRole: evaluatorRole || undefined,
        evaluatorName: evaluatorName.trim() || undefined,
        weight: w ?? undefined,
        height: parseNum(height) ?? undefined,
        bmi: computed.bmi ?? undefined,
        skinfolds: protocol === "manual" ? undefined : skinfolds,
        protocol,
        bodyFatPercent: computed.bodyFatPercent ?? undefined,
        leanMassKg: computed.leanMassKg ?? undefined,
        bodyMassKg: w ?? undefined,
        compositionStatus: computed.compositionStatus ?? undefined,
        vo2max: parseNum(vo2max) ?? undefined,
        cmjCm: parseNum(cmjCm) ?? undefined,
        illinoisSec: parseNum(illinoisSec) ?? undefined,
        tTestSec: parseNum(tTestSec) ?? undefined,
        sprint10m: parseNum(sprint10m) ?? undefined,
        sprint20m: parseNum(sprint20m) ?? undefined,
        yoyoDistance: parseNum(yoyoDistance) ?? undefined,
        rastPower: parseNum(rastPower) ?? undefined,
        mobilityNotes: mobilityNotes.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (edit) {
        await api.patch(`/fisiologia/assessments/${edit.id}`, payload);
      } else {
        await api.post("/fisiologia/assessments", payload);
      }
      onOpenChange(false);
      onSuccess();
      setFeedback({ open: true, title: "Salvo", message: "Avaliação registrada." });
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit ? "Editar avaliação" : "Nova avaliação física"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label>Atleta</Label>
                <NativeSelectField
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                  placeholder="Selecione…"
                  disabled={!!edit}
                  options={players.map((p) => ({
                    value: p.id,
                    label: `${p.name}${p.jerseyNumber != null ? ` #${p.jerseyNumber}` : ""}${p.category ? ` · ${getCategoryLabel(p.category, "pt")}` : ""}`,
                  }))}
                />
              </div>
              <div className="grid gap-1">
                <Label>Data</Label>
                <Input
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={assessedAt}
                  onChange={(e) => setAssessedAt(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label>Tipo</Label>
                <NativeSelect value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)}>
                  {ASSESSMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-1">
                <Label>Papel do avaliador</Label>
                <NativeSelect value={evaluatorRole} onChange={(e) => setEvaluatorRole(e.target.value)}>
                  {EVALUATOR_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-1 sm:col-span-2">
                <Label>Nome do avaliador</Label>
                <Input
                  className="text-foreground"
                  value={evaluatorName}
                  onChange={(e) => setEvaluatorName(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-sm font-semibold border-b border-border/60 pb-1">Antropometria</h5>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Peso (kg)</Label>
                  <Input className="text-foreground" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Altura (cm)</Label>
                  <Input className="text-foreground" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Idade na data</Label>
                  <Input className="text-foreground bg-muted/40" readOnly value={computed.age.ageLabel ?? "—"} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label>Protocolo de dobras</Label>
                  <NativeSelect value={protocol} onChange={(e) => setProtocol(e.target.value)}>
                    {PHYSIOLOGY_PROTOCOLS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                {protocol === "manual" ? (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">% gordura (manual)</Label>
                    <Input className="text-foreground" inputMode="decimal" value={manualBodyFat} onChange={(e) => setManualBodyFat(e.target.value)} />
                  </div>
                ) : null}
              </div>
              {protocol !== "manual" ? (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  {SKINFOLD_FIELDS.map((f) => (
                    <div key={f.key} className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">{f.label}</Label>
                      <Input
                        className="text-foreground"
                        inputMode="decimal"
                        value={skinfolds[f.key] != null ? String(skinfolds[f.key]) : ""}
                        onChange={(e) => setSkinfold(f.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-4 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">IMC</span>
                  <p className="font-medium">{computed.bmi ?? "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">% gordura</span>
                  <p className="font-medium">{computed.bodyFatPercent ?? "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Massa magra (kg)</span>
                  <p className="font-medium">{computed.leanMassKg ?? "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Status composição</span>
                  <p className="font-medium">
                    {computed.compositionStatus
                      ? COMPOSITION_STATUS_LABELS[computed.compositionStatus] ??
                        COMPOSITION_STATUS_OPTIONS.find((o) => o.value === computed.compositionStatus)?.label
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-sm font-semibold border-b border-border/60 pb-1">Testes físicos</h5>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">VO₂ máx</Label>
                  <Input className="text-foreground" inputMode="decimal" value={vo2max} onChange={(e) => setVo2max(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">CMJ (cm)</Label>
                  <Input className="text-foreground" inputMode="decimal" value={cmjCm} onChange={(e) => setCmjCm(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Illinois (s)</Label>
                  <Input className="text-foreground" inputMode="decimal" value={illinoisSec} onChange={(e) => setIllinoisSec(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">T-test (s)</Label>
                  <Input className="text-foreground" inputMode="decimal" value={tTestSec} onChange={(e) => setTTestSec(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Sprint 10 m (s)</Label>
                  <Input className="text-foreground" inputMode="decimal" value={sprint10m} onChange={(e) => setSprint10m(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Sprint 20 m (s)</Label>
                  <Input className="text-foreground" inputMode="decimal" value={sprint20m} onChange={(e) => setSprint20m(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Yo-Yo (m)</Label>
                  <Input className="text-foreground" inputMode="decimal" value={yoyoDistance} onChange={(e) => setYoyoDistance(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">RAST (W/kg)</Label>
                  <Input className="text-foreground" inputMode="decimal" value={rastPower} onChange={(e) => setRastPower(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Mobilidade / observações</Label>
                <textarea
                  className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={mobilityNotes}
                  onChange={(e) => setMobilityNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Notas</Label>
              <textarea
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </>
  );
}
