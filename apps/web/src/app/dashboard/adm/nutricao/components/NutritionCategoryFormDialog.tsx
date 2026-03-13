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

export interface NutritionCategoryRow {
  id: string;
  name: string;
  code: string | null;
  dailyCaloriesTarget: number | null;
  notes: string | null;
  tenant: { id: string; name: string; slug: string };
}

interface NutritionCategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  edit?: NutritionCategoryRow | null;
  onSuccess: () => void;
}

export function NutritionCategoryFormDialog({
  open,
  onOpenChange,
  tenants,
  edit,
  onSuccess,
}: NutritionCategoryFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [dailyCaloriesTarget, setDailyCaloriesTarget] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setName(edit.name);
      setCode(edit.code ?? "");
      setDailyCaloriesTarget(edit.dailyCaloriesTarget != null ? String(edit.dailyCaloriesTarget) : "");
      setNotes(edit.notes ?? "");
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setName("");
      setCode("");
      setDailyCaloriesTarget("");
      setNotes("");
    }
  }, [open, edit, tenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !name?.trim()) return;
    setSaving(true);
    try {
      if (edit) {
        await api.patch(`/nutricao/nutrition-categories/${edit.id}`, {
          name: name.trim(),
          code: code.trim() || undefined,
          dailyCaloriesTarget: dailyCaloriesTarget ? parseInt(dailyCaloriesTarget, 10) : undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await api.post("/nutricao/nutrition-categories", {
          tenantId,
          name: name.trim(),
          code: code.trim() || undefined,
          dailyCaloriesTarget: dailyCaloriesTarget ? parseInt(dailyCaloriesTarget, 10) : undefined,
          notes: notes.trim() || undefined,
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
            <DialogTitle>{edit ? "Editar categoria" : "Nova categoria nutricional"}</DialogTitle>
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
              <Label htmlFor="nc-name">Nome *</Label>
              <Input
                id="nc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Sub-17, Profissional"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nc-code">Código</Label>
              <Input
                id="nc-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex.: sub17, pro"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nc-cal">Meta calórica diária (kcal)</Label>
              <Input
                id="nc-cal"
                type="number"
                min={0}
                value={dailyCaloriesTarget}
                onChange={(e) => setDailyCaloriesTarget(e.target.value)}
                placeholder="Ex.: 2500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nc-notes">Observações</Label>
              <textarea
                id="nc-notes"
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
