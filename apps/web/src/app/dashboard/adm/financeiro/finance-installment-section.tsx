"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { splitInstallmentPreview } from "./finance-installment-util";

export function FinanceInstallmentSection({
  amount,
  paymentMode,
  onPaymentModeChange,
  installmentCount,
  onInstallmentCountChange,
  firstDueDate,
  onFirstDueDateChange,
}: {
  amount: number;
  paymentMode: "avista" | "parcelado";
  onPaymentModeChange: (m: "avista" | "parcelado") => void;
  installmentCount: number;
  onInstallmentCountChange: (n: number) => void;
  firstDueDate: string;
  onFirstDueDateChange: (d: string) => void;
}) {
  const preview = useMemo(() => {
    if (paymentMode !== "parcelado" || amount <= 0 || installmentCount < 2) return [];
    return splitInstallmentPreview(amount, installmentCount);
  }, [amount, installmentCount, paymentMode]);

  return (
    <div className="space-y-3 rounded-md border border-border/60 p-3">
      <Label className="text-foreground">Pagamento</Label>
      <NativeSelect
        value={paymentMode}
        onChange={(e) => onPaymentModeChange(e.target.value as "avista" | "parcelado")}
      >
        <option value="avista">À vista</option>
        <option value="parcelado">Parcelado</option>
      </NativeSelect>
      {paymentMode === "parcelado" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="instCount">Nº de parcelas</Label>
              <Input
                id="instCount"
                type="number"
                min={2}
                max={120}
                className="text-foreground"
                value={installmentCount}
                onChange={(e) => onInstallmentCountChange(Math.max(2, Number(e.target.value) || 2))}
              />
            </div>
            <div>
              <Label htmlFor="firstDue">1º vencimento</Label>
              <Input
                id="firstDue"
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={firstDueDate}
                onChange={(e) => onFirstDueDateChange(e.target.value)}
              />
            </div>
          </div>
          {preview.length > 0 ? (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Prévia</p>
              {preview.map((p) => (
                <p key={p.installmentNumber}>
                  {p.installmentNumber}/{installmentCount} ·{" "}
                  {p.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
