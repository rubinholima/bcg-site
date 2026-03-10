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
import { SupplierRow } from "./SupplierFormDialog";

export interface OrderItem {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice?: number;
}

export interface PurchaseOrderRow {
  id: string;
  tenantId: string;
  requisitionId: string | null;
  supplierId: string;
  orderNumber: string | null;
  orderedAt: string;
  status: string;
  items: unknown;
  totalAmount: number | null;
  expectedDelivery: string | null;
  supplier: { id: string; name: string };
  tenant: { id: string; name: string; slug: string };
}

const ORDER_STATUSES = ["draft", "sent", "approved", "received", "cancelled"] as const;

interface PurchaseOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  suppliers: SupplierRow[];
  products: ProductRow[];
  requisitions?: { id: string; requestedByName: string; tenantId: string }[];
  edit?: PurchaseOrderRow | null;
  onSuccess: () => void;
}

function parseOrderItems(items: unknown): OrderItem[] {
  if (!Array.isArray(items) || items.length === 0) return [{ description: "", quantity: 1 }];
  return items.map((it: Record<string, unknown>) => ({
    productId: typeof it.productId === "string" ? it.productId : undefined,
    description: typeof it.description === "string" ? it.description : "",
    quantity: typeof it.quantity === "number" ? it.quantity : 1,
    unitPrice: typeof it.unitPrice === "number" ? it.unitPrice : undefined,
  }));
}

export function PurchaseOrderFormDialog({
  open,
  onOpenChange,
  tenants,
  suppliers,
  products,
  requisitions = [],
  edit,
  onSuccess,
}: PurchaseOrderFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [requisitionId, setRequisitionId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [status, setStatus] = useState("draft");
  const [totalAmount, setTotalAmount] = useState<number | "">("");
  const [items, setItems] = useState<OrderItem[]>([{ description: "", quantity: 1 }]);

  const tenantSuppliers = suppliers.filter((s) => s.tenant.id === tenantId);
  const tenantProducts = products.filter((p) => p.tenant.id === tenantId);
  const tenantRequisitions = requisitions.filter((r) => r.tenantId === tenantId);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setSupplierId(edit.supplierId);
      setRequisitionId(edit.requisitionId ?? "");
      setOrderNumber(edit.orderNumber ?? "");
      setExpectedDelivery(edit.expectedDelivery ? edit.expectedDelivery.slice(0, 10) : "");
      setStatus(edit.status);
      setTotalAmount(edit.totalAmount ?? "");
      setItems(parseOrderItems(edit.items));
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setSupplierId("");
      setRequisitionId("");
      setOrderNumber("");
      setExpectedDelivery("");
      setStatus("draft");
      setTotalAmount("");
      setItems([{ description: "", quantity: 1 }]);
    }
  }, [open, edit, tenants]);

  useEffect(() => {
    if (!edit && open && tenantId && !supplierId && tenantSuppliers.length > 0) {
      setSupplierId(tenantSuppliers[0].id);
    }
  }, [tenantId, tenantSuppliers, edit, open, supplierId]);

  const addItem = () => {
    setItems((prev) => [...prev, { description: "", quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number | undefined) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !supplierId?.trim()) return;
    const validItems = items.filter((i) => i.description?.trim());
    if (validItems.length === 0) {
      alert("Adicione ao menos um item com descrição.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tenantId,
        supplierId,
        requisitionId: requisitionId || undefined,
        orderNumber: orderNumber.trim() || undefined,
        expectedDelivery: expectedDelivery ? `${expectedDelivery}T12:00:00.000Z` : undefined,
        items: validItems.map((i) => ({
          productId: i.productId || undefined,
          description: i.description.trim(),
          quantity: Number(i.quantity) || 1,
          unitPrice: i.unitPrice ?? undefined,
        })),
        totalAmount: totalAmount === "" ? undefined : Number(totalAmount),
      };
      if (edit) {
        await api.patch(`/compras/purchase-orders/${edit.id}`, { ...payload, status });
      } else {
        await api.post("/compras/purchase-orders", payload);
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
            <DialogTitle>{edit ? "Editar ordem de compra" : "Nova ordem de compra"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="order-tenant">Clube/Empresa *</Label>
                <select
                  id="order-tenant"
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
                <Label htmlFor="order-supplier">Fornecedor *</Label>
                <select
                  id="order-supplier"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {tenantSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="order-requisition">Requisição (opcional)</Label>
                <select
                  id="order-requisition"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={requisitionId}
                  onChange={(e) => setRequisitionId(e.target.value)}
                >
                  <option value="">Nenhuma</option>
                  {tenantRequisitions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.requestedByName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order-number">Nº da ordem</Label>
                <Input
                  id="order-number"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Número da OP"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="order-expected">Previsão de entrega</Label>
                <Input
                  id="order-expected"
                  type="date"
                  className="text-foreground"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                />
              </div>
              {edit && (
                <div className="grid gap-2">
                  <Label htmlFor="order-status">Status</Label>
                  <select
                    id="order-status"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
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
                      <th className="text-right p-2 w-28">Preço un.</th>
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
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            className="text-right w-28"
                            value={item.unitPrice ?? ""}
                            onChange={(e) =>
                              updateItem(
                                idx,
                                "unitPrice",
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
              <Label htmlFor="order-total">Total (R$)</Label>
              <Input
                id="order-total"
                type="number"
                step="0.01"
                min={0}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
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
