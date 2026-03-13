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
import type { NutritionCategoryRow } from "./NutritionCategoryFormDialog";
import { FIXTURE_CATEGORIES, getCategoryLabel } from "@/lib/fixture-categories";
import type { NutritionMenuRow } from "./NutritionMenuFormDialog";

export interface NutritionCalendarEntryRow {
  id: string;
  date: string;
  categoryId: string;
  menuId: string;
  dayContext: string | null;
  notes: string | null;
  category: { id: string; name: string };
  menu: { id: string; name: string; dayContext: string | null };
}

interface NutritionCalendarFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  categories: NutritionCategoryRow[];
  menus: NutritionMenuRow[];
  tenantId: string;
  ensureCategoriesForTenant?: (tenantId: string) => Promise<void>;
  edit?: NutritionCalendarEntryRow | null;
  onSuccess: () => void;
}

export function NutritionCalendarFormDialog({
  open,
  onOpenChange,
  tenants,
  categories,
  menus,
  tenantId,
  ensureCategoriesForTenant,
  edit,
  onSuccess,
}: NutritionCalendarFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tId, setTId] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [menuId, setMenuId] = useState("");
  const [dayContext, setDayContext] = useState<string>("__none__");
  const [notes, setNotes] = useState("");

  const tenantCategories = categories.filter((c) => c.tenant.id === (tId || tenantId));
  const tenantMenus = menus.filter((m) => m.tenant.id === (tId || tenantId));
  /** Opções de categoria na mesma ordem do menu Cadastros > Futebol > Categorias */
  const categoryOptions = FIXTURE_CATEGORIES.map((cat) => {
    const c = tenantCategories.find((tc) => tc.code === cat.value);
    return c ? { value: c.id, label: getCategoryLabel(cat.value, "pt") } : null;
  }).filter((x): x is { value: string; label: string } => x != null);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTId(tenantId);
      setDate(edit.date.slice(0, 10));
      setCategoryId(edit.categoryId);
      setMenuId(edit.menuId);
      setDayContext(edit.dayContext ?? "__none__");
      setNotes(edit.notes ?? "");
    } else {
      setTId(tenantId);
      setDate("");
      const firstId = categoryOptions[0]?.value ?? "";
      setCategoryId(firstId);
      setMenuId("");
      setDayContext("__none__");
      setNotes("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- categoryOptions order is stable from FIXTURE_CATEGORIES
  }, [open, edit, tenantId]);

  useEffect(() => {
    if (!open || !ensureCategoriesForTenant) return;
    const tid = edit ? tenantId : tId || tenantId;
    if (!tid) return;
    const forTenant = categories.filter((c) => c.tenant.id === tid);
    if (forTenant.length === 0) void ensureCategoriesForTenant(tid);
  }, [open, ensureCategoriesForTenant, edit, tId, tenantId, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tId?.trim() || !date || !categoryId?.trim() || !menuId?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenantId: tId,
        categoryId,
        date: `${date}T12:00:00.000Z`,
        menuId,
        dayContext: dayContext === "__none__" ? undefined : dayContext,
        notes: notes.trim() || undefined,
      };
      if (edit) {
        await api.patch(`/nutricao/nutrition-calendar/${edit.id}`, {
          menuId,
          dayContext: dayContext === "__none__" ? null : dayContext,
          notes: notes.trim() || null,
        });
      } else {
        await api.post("/nutricao/nutrition-calendar", payload);
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
            <DialogTitle>{edit ? "Editar dia do calendário" : "Definir cardápio do dia"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Clube/Empresa *</Label>
              <select
                required
                disabled={!!edit}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={tId}
                onChange={(e) => setTId(e.target.value)}
              >
                <option value="">Selecione</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ncal-date">Data *</Label>
              <Input
                id="ncal-date"
                type="date"
                required
                disabled={!!edit}
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Categoria *</Label>
              <select
                required
                disabled={!!edit}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Selecione</option>
                {categoryOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Cardápio *</Label>
              <select
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={menuId}
                onChange={(e) => setMenuId(e.target.value)}
              >
                <option value="">Selecione o cardápio</option>
                {tenantMenus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.dayContext ? `(${m.dayContext})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Contexto do dia</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={dayContext}
                onChange={(e) => setDayContext(e.target.value)}
              >
                <option value="__none__">—</option>
                <option value="treino">Treino</option>
                <option value="jogo">Jogo</option>
                <option value="folga">Folga</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ncal-notes">Observações</Label>
              <Input
                id="ncal-notes"
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
