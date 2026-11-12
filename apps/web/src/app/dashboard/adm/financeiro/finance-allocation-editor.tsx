"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";

type Cat = { id: string; name: string; parentId: string | null };

export type AllocationRow = {
  financeCategoryId?: string;
  description?: string;
  amount: number;
};

export function FinanceAllocationEditor({
  documentTotal,
  categories,
  onChange,
}: {
  documentTotal: number;
  categories: Cat[];
  onChange: (rows: AllocationRow[]) => void;
}) {
  const [rows, setRows] = useState<AllocationRow[]>([{ amount: documentTotal }]);

  const classified = useMemo(
    () => rows.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0),
    [rows],
  );
  const diff = Math.round((documentTotal - classified) * 100) / 100;

  function update(next: AllocationRow[]) {
    setRows(next);
    onChange(next);
  }

  function addRow() {
    update([...rows, { amount: 0 }]);
  }

  return (
    <div className="space-y-2 rounded-md border border-border/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-foreground">Classificações</Label>
        <Button type="button" size="sm" variant="secondary" onClick={addRow}>
          Adicionar classificação
        </Button>
      </div>
      {rows.map((row, idx) => (
        <div key={idx} className="grid gap-2 sm:grid-cols-3">
          <NativeSelect
            value={row.financeCategoryId ?? ""}
            onChange={(e) => {
              const copy = [...rows];
              copy[idx] = { ...copy[idx], financeCategoryId: e.target.value || undefined };
              update(copy);
            }}
          >
            <option value="">Categoria…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentId ? "↳ " : ""}
                {c.name}
              </option>
            ))}
          </NativeSelect>
          <Input
            placeholder="Descrição"
            className="text-foreground"
            value={row.description ?? ""}
            onChange={(e) => {
              const copy = [...rows];
              copy[idx] = { ...copy[idx], description: e.target.value };
              update(copy);
            }}
          />
          <Input
            placeholder="Valor"
            inputMode="decimal"
            className="text-foreground"
            value={String(row.amount ?? "")}
            onChange={(e) => {
              const copy = [...rows];
              copy[idx] = { ...copy[idx], amount: Number(e.target.value.replace(",", ".")) || 0 };
              update(copy);
            }}
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Total documento: {documentTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ·
        Classificado: {classified.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · Diferença:{" "}
        <span className={diff !== 0 ? "text-amber-400" : "text-foreground"}>
          {diff.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      </p>
    </div>
  );
}
