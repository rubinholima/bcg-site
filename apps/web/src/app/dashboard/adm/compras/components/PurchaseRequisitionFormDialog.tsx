"use client";

import { useState, useEffect } from "react";
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
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { ProductRow } from "./ProductFormDialog";

export interface RequisitionItem {
  productId?: string;
  description: string;
  quantity: number;
  unit?: string;
  estimatedUnitPrice?: number;
}

export interface PurchaseRequisitionRow {
  id: string;
  tenantId: string;
  requestedByName: string;
  requestedAt: string;
  status: string;
  justification: string | null;
  items: unknown;
  totalEstimated: number | null;
  tenant: { id: string; name: string; slug: string };
}

const REQUISITION_STATUSES = [
  "draft",
  "sent",
  "quotation",
  "approved",
  "rejected",
  "ordered",
  "received",
] as const;

interface PurchaseRequisitionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  products: ProductRow[];
  edit?: PurchaseRequisitionRow | null;
  onSuccess: () => void;
}

function parseItems(items: unknown): RequisitionItem[] {
  if (!Array.isArray(items) || items.length === 0) return [{ description: "", quantity: 1, unit: "un" }];
  return items.map((it: Record<string, unknown>) => ({
    productId: typeof it.productId === "string" ? it.productId : undefined,
    description: typeof it.description === "string" ? it.description : "",
    quantity: typeof it.quantity === "number" ? it.quantity : 1,
    unit: typeof it.unit === "string" ? it.unit : "un",
    estimatedUnitPrice: typeof it.estimatedUnitPrice === "number" ? it.estimatedUnitPrice : undefined,
  }));
}

export function PurchaseRequisitionFormDialog({
  open,
  onOpenChange,
  tenants,
  products,
  edit,
  onSuccess,
}: PurchaseRequisitionFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [requestedByName, setRequestedByName] = useState("");
  const [justification, setJustification] = useState("");
  const [status, setStatus] = useState("draft");
  const [totalEstimated, setTotalEstimated] = useState<number | "">("");
  const [items, setItems] = useState<RequisitionItem[]>([{ description: "", quantity: 1, unit: "un" }]);

  const tenantProducts = products.filter((p) => p.tenant.id === tenantId);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setRequestedByName(edit.requestedByName);
      setJustification(edit.justification ?? "");
      setStatus(edit.status);
      setTotalEstimated(edit.totalEstimated ?? "");
      setItems(parseItems(edit.items));
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setRequestedByName("");
      setJustification("");
      setStatus("draft");
      setTotalEstimated("");
      setItems([{ description: "", quantity: 1, unit: "un" }]);
    }
  }, [open, edit, tenants]);

  const addItem = () => {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit: "un" }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof RequisitionItem, value: string | number | undefined) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !requestedByName?.trim()) return;
    const validItems = items.filter((i) => i.description?.trim());
    if (validItems.length === 0) {
      alert("Adicione ao menos um item com descrição.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tenantId,
        requestedByName: requestedByName.trim(),
        justification: justification.trim() || undefined,
        items: validItems.map((i) => ({
          productId: i.productId || undefined,
          description: i.description.trim(),
          quantity: Number(i.quantity) || 1,
          unit: i.unit || "un",
          estimatedUnitPrice: i.estimatedUnitPrice ?? undefined,
        })),
        totalEstimated: totalEstimated === "" ? undefined : Number(totalEstimated),
      };
      if (edit) {
        await api.patch(`/compras/purchase-requisitions/${edit.id}`, { ...payload, status });
      } else {
        await api.post("/compras/purchase-requisitions", payload);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{edit ? "Editar requisição de compra" : "Nova requisição de compra"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="req-tenant">Clube/Empresa *</Label>
                <select
                  id="req-tenant"
                  required
                  disabled={!!edit}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="req-requestedBy">Solicitante *</Label>
                <Input
                  id="req-requestedBy"
                  value={requestedByName}
                  onChange={(e) => setRequestedByName(e.target.value)}
                  placeholder="Nome de quem solicitou"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="req-justification">Justificativa</Label>
              <textarea
                id="req-justification"
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Justificativa da requisição"
              />
            </div>
            {edit && (
              <div className="grid gap-2">
                <Label htmlFor="req-status">Status</Label>
                <select
                  id="req-status"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {REQUISITION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Itens</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Item
                </Button>
              </div>
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Produto / Descrição</th>
                      <th className="text-right p-2 w-20">Qtd</th>
                      <th className="text-left p-2 w-24">Un</th>
                      <th className="text-right p-2 w-28">Preço un. est.</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="p-2">
                          <select
                            className="w-full rounded border border-input bg-background px-2 py-1.5 text-foreground text-sm"
                            value={item.productId ?? ""}
                            onChange={(e) => {
                              const id = e.target.value;
                              const p = tenantProducts.find((x) => x.id === id);
                              updateItem(idx, "productId", id);
                              if (p) updateItem(idx, "description", p.name);
                              if (p?.unit) updateItem(idx, "unit", p.unit);
                            }}
                          >
                            <option value="">— Descrição livre</option>
                            {tenantProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.sku ? `(${p.sku})` : ""}
                              </option>
                            ))}
                          </select>
                          <Input
                            className="mt-1"
                            value={item.description}
                            onChange={(e) => updateItem(idx, "description", e.target.value)}
                            placeholder="Descrição do item"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            min={1}
                            className="text-right w-20"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value, 10) || 1)}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.unit ?? "un"}
                            onChange={(e) => updateItem(idx, "unit", e.target.value)}
                            className="w-24"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            className="text-right w-28"
                            value={item.estimatedUnitPrice ?? ""}
                            onChange={(e) =>
                              updateItem(
                                idx,
                                "estimatedUnitPrice",
                                e.target.value === "" ? undefined : parseFloat(e.target.value)
                              )
                            }
                            placeholder="0"
                          />
                        </td>
                        <td className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeItem(idx)}
                            disabled={items.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid gap-2 max-w-[200px]">
              <Label htmlFor="req-total">Total estimado (R$)</Label>
              <Input
                id="req-total"
                type="number"
                step="0.01"
                min={0}
                value={totalEstimated}
                onChange={(e) => setTotalEstimated(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {edit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
