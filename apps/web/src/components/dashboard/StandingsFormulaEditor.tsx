"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const STANDINGS_FORMULA_PRESETS: { value: string; label: string }[] = [
  { value: "pontos:desc,saldo_gols:desc,gols_marcados:desc,vitorias:desc", label: "Padrão (pontos → saldo → gols marcados → vitórias)" },
  { value: "pontos:desc,vitorias:desc,saldo_gols:desc,gols_marcados:desc", label: "Vitórias primeiro (pontos → vitórias → saldo → gols)" },
  { value: "pontos:desc,saldo_gols:desc,gols_marcados:desc", label: "Simples (pontos → saldo → gols marcados)" },
];

const FORMULA_FIELDS: { value: string; label: string }[] = [
  { value: "__none__", label: "— (não usar)" },
  { value: "pontos", label: "Pontos" },
  { value: "saldo_gols", label: "Saldo de gols" },
  { value: "gols_marcados", label: "Gols marcados" },
  { value: "gols_sofridos", label: "Gols sofridos" },
  { value: "vitorias", label: "Vitórias" },
  { value: "empates", label: "Empates" },
  { value: "derrotas", label: "Derrotas" },
  { value: "jogos", label: "Jogos" },
];

const FORMULA_DIRS: { value: string; label: string }[] = [
  { value: "desc", label: "Maior primeiro" },
  { value: "asc", label: "Menor primeiro" },
];

const SLOT_COUNT = 7;

function formulaToSlots(formula: string): Array<{ field: string; dir: string }> {
  const parts = formula.trim().split(",").filter(Boolean);
  const slots: Array<{ field: string; dir: string }> = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const p = parts[i];
    if (p) {
      const [f, d] = p.split(":").map((s) => s.trim().toLowerCase());
      slots.push({ field: f || "__none__", dir: d === "asc" ? "asc" : "desc" });
    } else {
      slots.push({ field: "__none__", dir: "desc" });
    }
  }
  return slots;
}

function slotsToFormula(slots: Array<{ field: string; dir: string }>): string {
  return slots
    .filter((s) => s.field && s.field !== "__none__")
    .map((s) => `${s.field}:${s.dir}`)
    .join(",");
}

export function StandingsFormulaEditor({
  formula,
  formulaName,
  onFormulaChange,
  onFormulaNameChange,
  disabled,
}: {
  formula: string;
  formulaName: string;
  onFormulaChange: (v: string) => void;
  onFormulaNameChange: (v: string) => void;
  disabled?: boolean;
}) {
  const isPreset = STANDINGS_FORMULA_PRESETS.some((p) => p.value === formula);
  const isCustom = !isPreset;
  const showNameField = isCustom && formula.trim().length > 0;

  const slots = useMemo(() => formulaToSlots(formula), [formula]);

  const handlePresetChange = (v: string) => {
    if (v === "custom") {
      const preset = STANDINGS_FORMULA_PRESETS.find((p) => p.value === formula);
      if (preset) {
        onFormulaChange(formula + ",empates:desc");
      }
      return;
    }
    onFormulaChange(v);
    onFormulaNameChange("");
  };

  const handleSlotChange = (index: number, field: string, dir: string) => {
    const next = [...slots];
    next[index] = { field, dir };
    onFormulaChange(slotsToFormula(next));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Fórmula de cálculo de posição</Label>
        <Select
          value={isPreset ? formula : "custom"}
          onValueChange={handlePresetChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione a fórmula" />
          </SelectTrigger>
          <SelectContent>
            {STANDINGS_FORMULA_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">
              Personalizado
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isCustom && (
        <>
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Ordem dos critérios (1º = principal, 2º = desempate, etc.)
            </p>
            {Array.from({ length: SLOT_COUNT }, (_, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                <Select
                  value={slots[i]?.field ?? "__none__"}
                  onValueChange={(v) => handleSlotChange(i, v, slots[i]?.dir ?? "desc")}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMULA_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={slots[i]?.field && slots[i]?.field !== "__none__" ? (slots[i]?.dir ?? "desc") : "desc"}
                  onValueChange={(v) => handleSlotChange(i, slots[i]?.field ?? "__none__", v)}
                  disabled={disabled || !slots[i]?.field || slots[i]?.field === "__none__"}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMULA_DIRS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {showNameField && (
            <div className="space-y-2">
              <Label>Nome da fórmula</Label>
              <Input
                placeholder="Ex: Fórmula CBF, Critério Brasileirão"
                value={formulaName}
                onChange={(e) => onFormulaNameChange(e.target.value)}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Nome opcional para identificar esta fórmula personalizada.
              </p>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Ordem de critérios para desempate na tabela de classificação.
      </p>
    </div>
  );
}
