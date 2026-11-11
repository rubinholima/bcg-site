"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import type { Tenant } from "@/types/tenant";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import type { SupplierRow } from "./SupplierFormDialog";

type Line = { productId: string; description: string; quantity: string; unit: string; specification: string };

export function ManualQuotationDialog({
  open,
  onOpenChange,
  tenants,
  defaultTenantId,
  suppliers,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenants: Tenant[];
  defaultTenantId: string;
  suppliers: SupplierRow[];
  onCreated: (requisitionId: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState(defaultTenantId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [lines, setLines] = useState<Line[]>([
    { productId: "", description: "", quantity: "1", unit: "un", specification: "" },
  ]);
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  useEffect(() => {
    if (!open) return;
    setTenantId(defaultTenantId || tenants[0]?.id || "");
    setTitle("");
    setDescription("");
    setDeadline("");
    setCurrency("BRL");
    setLines([{ productId: "", description: "", quantity: "1", unit: "un", specification: "" }]);
    setSupplierIds([]);
  }, [open, defaultTenantId, tenants]);

  const toggleSupplier = (id: string) => {
    setSupplierIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    if (!tenantId || !title.trim()) return;
    const items = lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        productId: l.productId || undefined,
        description: l.description.trim(),
        quantity: Math.max(1, parseInt(l.quantity, 10) || 1),
        unit: l.unit.trim() || "un",
        specification: l.specification.trim() || undefined,
      }));
    if (!items.length) {
      setFeedback({ open: true, title: "Itens", message: "Informe ao menos um item." });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post<{ id: string }>("/compras/workflow/manual-quotations", {
        tenantId,
        title: title.trim(),
        description: description.trim() || undefined,
        quoteDeadline: deadline || undefined,
        currency,
        items,
        supplierIds: supplierIds.length ? supplierIds : undefined,
      });
      if (data?.id && supplierIds.length) {
        await api.post(`/compras/workflow/requisitions/${data.id}/quote-invites`, {
          supplierIds,
          expiresInDays: 14,
          sendEmail: false,
        });
      }
      onCreated(data.id);
      onOpenChange(false);
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível criar a cotação.",
      });
    } finally {
      setSaving(false);
    }
  };

  const tenantSuppliers = suppliers.filter((s) => !tenantId || s.tenant.id === tenantId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[min(42rem,calc(100vw-1.5rem))]">
          <DialogHeader>
            <DialogTitle>Nova cotação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Empresa *</Label>
              <NativeSelect value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
                <option value="">Selecione</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <textarea
                className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Moeda</Label>
                <NativeSelect value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                </NativeSelect>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setLines((p) => [...p, { productId: "", description: "", quantity: "1", unit: "un", specification: "" }])
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {lines.map((line, i) => (
                <div key={i} className="grid gap-2 rounded-md border border-border p-3">
                  <Input
                    placeholder="Descrição do item"
                    value={line.description}
                    onChange={(e) => {
                      const next = [...lines];
                      next[i] = { ...next[i], description: e.target.value };
                      setLines(next);
                    }}
                  />
                  <Input
                    placeholder="Especificação (opcional)"
                    value={line.specification}
                    onChange={(e) => {
                      const next = [...lines];
                      next[i] = { ...next[i], specification: e.target.value };
                      setLines(next);
                    }}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i] = { ...next[i], quantity: e.target.value };
                        setLines(next);
                      }}
                    />
                    <Input
                      value={line.unit}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i] = { ...next[i], unit: e.target.value };
                        setLines(next);
                      }}
                    />
                    {lines.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setLines((p) => p.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {tenantSuppliers.length > 0 ? (
              <div className="space-y-2">
                <Label>Fornecedores convidados (opcional)</Label>
                <div className="flex flex-wrap gap-2">
                  {tenantSuppliers.map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      size="sm"
                      variant={supplierIds.includes(s.id) ? "default" : "outline"}
                      onClick={() => toggleSupplier(s.id)}
                    >
                      {s.name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving || !title.trim() || !tenantId} onClick={() => void submit()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar cotação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FeedbackModal
        open={feedback.open}
        onOpenChange={(o) => setFeedback((f) => ({ ...f, open: o }))}
        title={feedback.title}
        message={feedback.message}
      />
    </>
  );
}
