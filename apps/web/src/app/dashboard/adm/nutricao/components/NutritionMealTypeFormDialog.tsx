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

export interface NutritionMealTypeRow {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  tenant: { id: string; name: string; slug: string };
}

interface NutritionMealTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  edit?: NutritionMealTypeRow | null;
  onSuccess: () => void;
}

export function NutritionMealTypeFormDialog({
  open,
  onOpenChange,
  tenants,
  edit,
  onSuccess,
}: NutritionMealTypeFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sortOrder, setSortOrder] = useState<string>("0");

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setName(edit.name);
      setCode(edit.code);
      setSortOrder(String(edit.sortOrder ?? 0));
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setName("");
      setCode("");
      setSortOrder("0");
    }
  }, [open, edit, tenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !name?.trim() || !code?.trim()) return;
    setSaving(true);
    try {
      if (edit) {
        await api.patch(`/nutricao/nutrition-meal-types/${edit.id}`, {
          name: name.trim(),
          code: code.trim(),
          sortOrder: parseInt(sortOrder, 10) || 0,
        });
      } else {
        await api.post("/nutricao/nutrition-meal-types", {
          tenantId,
          name: name.trim(),
          code: code.trim(),
          sortOrder: parseInt(sortOrder, 10) || 0,
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
            <DialogTitle>{edit ? "Editar tipo de refeição" : "Novo tipo de refeição"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Clube/Empresa *</Label>
              <select
                required
                disabled={!!edit}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              >
                <option value="">Selecione</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nmt-name">Nome *</Label>
              <Input
                id="nmt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Café da manhã, Pré-jogo"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nmt-code">Código *</Label>
              <Input
                id="nmt-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex.: cafe_manha, pre_jogo"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nmt-order">Ordem</Label>
              <Input
                id="nmt-order"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
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
