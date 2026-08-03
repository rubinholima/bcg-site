"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLogisticaCadastrosLookups } from "@/hooks/useLogisticaCadastrosLookups";
import {
  createExpenseLineId,
  type LogisticsExpenseLine,
} from "@/lib/logistica-travel-cadastros.types";

interface Props {
  lines: LogisticsExpenseLine[];
  onChange: (next: LogisticsExpenseLine[]) => void;
  defaultPaymentTypeId?: string | null;
  defaultSupplierId?: string | null;
  tenantId?: string;
  disabled?: boolean;
}

export function LogisticaExpenseLinesFields({
  lines,
  onChange,
  defaultPaymentTypeId,
  defaultSupplierId,
  tenantId,
  disabled,
}: Props) {
  const lookups = useLogisticaCadastrosLookups(tenantId);

  const updateLine = (id: string, patch: Partial<LogisticsExpenseLine>) => {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    onChange([
      ...lines,
      {
        id: createExpenseLineId(),
        expenseCategoryId: null,
        serviceProductId: null,
        supplierId: defaultSupplierId ?? null,
        paymentTypeId: defaultPaymentTypeId ?? null,
        description: "",
        amount: null,
      },
    ]);
  };

  const removeLine = (id: string) => {
    onChange(lines.filter((l) => l.id !== id));
  };

  const handleServiceSelect = (lineId: string, value: string) => {
    if (value === "none") {
      updateLine(lineId, { serviceProductId: null });
      return;
    }
    const sp = lookups.serviceProducts.find((s) => s.id === value);
    updateLine(lineId, {
      serviceProductId: value,
      expenseCategoryId: sp?.expenseCategoryId ?? null,
      description: sp?.name ?? "",
    });
  };

  const servicesForCategory = (categoryId: string | null | undefined) => {
    if (!categoryId) return lookups.serviceProducts;
    return lookups.serviceProducts.filter(
      (s) => !s.expenseCategoryId || s.expenseCategoryId === categoryId,
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-base">Despesas (cadastros)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[44px]"
          onClick={addLine}
          disabled={disabled || lookups.loading}
        >
          <Plus className="mr-1 h-4 w-4" />
          Adicionar linha
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Use categoria, serviço/produto e forma de pagamento dos cadastros de logística. Fornecedor
        vem do cadastro único (Adm → Fornecedores) do clube da viagem.
      </p>

      {lines.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
          Nenhuma despesa detalhada. O custo total estimado pode ser informado à parte.
        </p>
      ) : (
        <div className="space-y-3">
          {lines.map((line) => (
            <div
              key={line.id}
              className="grid gap-3 rounded-lg border border-border/70 p-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria de despesa</Label>
                <Select
                  value={line.expenseCategoryId ?? "none"}
                  onValueChange={(v) =>
                    updateLine(line.id, {
                      expenseCategoryId: v === "none" ? null : v,
                      serviceProductId: null,
                    })
                  }
                  disabled={disabled || lookups.loading}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {lookups.expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Serviço / produto</Label>
                <Select
                  value={line.serviceProductId ?? "none"}
                  onValueChange={(v) => handleServiceSelect(line.id, v)}
                  disabled={disabled || lookups.loading}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {servicesForCategory(line.expenseCategoryId).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Fornecedor</Label>
                <Select
                  value={line.supplierId ?? "none"}
                  onValueChange={(v) =>
                    updateLine(line.id, { supplierId: v === "none" ? null : v })
                  }
                  disabled={disabled || lookups.loading}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {lookups.suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Forma de pagamento</Label>
                <Select
                  value={line.paymentTypeId ?? "none"}
                  onValueChange={(v) =>
                    updateLine(line.id, { paymentTypeId: v === "none" ? null : v })
                  }
                  disabled={disabled || lookups.loading}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {lookups.paymentTypes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={line.description ?? ""}
                  onChange={(e) => updateLine(line.id, { description: e.target.value })}
                  placeholder="Opcional"
                  disabled={disabled}
                />
              </div>

              <div className="flex items-end gap-2">
                <div className="grid flex-1 gap-1.5">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="text-foreground"
                    value={line.amount != null && Number.isFinite(line.amount) ? String(line.amount) : ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim().replace(",", ".");
                      updateLine(line.id, {
                        amount: raw === "" ? null : Number(raw),
                      });
                    }}
                    placeholder="0,00"
                    disabled={disabled}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] shrink-0"
                  onClick={() => removeLine(line.id)}
                  disabled={disabled}
                  aria-label="Remover linha"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
