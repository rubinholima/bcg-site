"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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

export interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  stockMin: number;
  currentStock: number;
  tenant: { id: string; name: string; slug: string };
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  edit?: ProductRow | null;
  onSuccess: () => void;
}

const DEFAULT_UNIT = "un";

export function ProductFormDialog({
  open,
  onOpenChange,
  tenants,
  edit,
  onSuccess,
}: ProductFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState(DEFAULT_UNIT);
  const [stockMin, setStockMin] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setName(edit.name);
      setSku(edit.sku ?? "");
      setUnit(edit.unit || DEFAULT_UNIT);
      setStockMin(edit.stockMin);
      setCurrentStock(edit.currentStock);
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setName("");
      setSku("");
      setUnit(DEFAULT_UNIT);
      setStockMin(0);
      setCurrentStock(0);
    }
  }, [open, edit, tenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !name?.trim()) return;
    setSaving(true);
    try {
      if (edit) {
        await api.patch(`/compras/products/${edit.id}`, {
          name: name.trim(),
          sku: sku.trim() || undefined,
          unit: unit.trim() || DEFAULT_UNIT,
          stockMin: Math.max(0, stockMin),
          currentStock: Math.max(0, currentStock),
        });
      } else {
        await api.post("/compras/products", {
          tenantId,
          name: name.trim(),
          sku: sku.trim() || undefined,
          unit: unit.trim() || DEFAULT_UNIT,
          stockMin: Math.max(0, stockMin),
          currentStock: Math.max(0, currentStock),
        });
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
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{edit ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="product-tenant">Clube/Empresa *</Label>
              <select
                id="product-tenant"
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
              <Label htmlFor="product-name">Nome *</Label>
              <Input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do produto"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-sku">SKU</Label>
              <Input
                id="product-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Código/SKU"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="product-unit">Unidade</Label>
                <Input
                  id="product-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="un, cx, kg..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-stockMin">Estoque mínimo</Label>
                <Input
                  id="product-stockMin"
                  type="number"
                  min={0}
                  value={stockMin}
                  onChange={(e) => setStockMin(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-currentStock">Estoque atual</Label>
              <Input
                id="product-currentStock"
                type="number"
                min={0}
                value={currentStock}
                onChange={(e) => setCurrentStock(parseInt(e.target.value, 10) || 0)}
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
