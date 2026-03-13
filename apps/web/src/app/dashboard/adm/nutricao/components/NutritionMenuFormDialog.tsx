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
import { FIXTURE_CATEGORIES, getCategoryLabel } from "@/lib/fixture-categories";
import type { NutritionCategoryRow } from "./NutritionCategoryFormDialog";

export interface NutritionMenuRow {
  id: string;
  name: string;
  categoryId: string | null;
  dayContext: string | null;
  validFrom: string | null;
  validTo: string | null;
  notes: string | null;
  tenant: { id: string; name: string; slug: string };
  category?: { id: string; name: string; code: string | null } | null;
  items?: Array<{
    id: string;
    description: string;
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatsG: number | null;
    mealType: { id: string; name: string; code: string };
  }>;
}

interface NutritionMenuFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  categories: NutritionCategoryRow[];
  tenantId: string;
  /** Carrega categorias do tenant quando o diálogo precisa (ex.: clube selecionado ainda sem categorias) */
  ensureCategoriesForTenant?: (tenantId: string) => Promise<void>;
  edit?: NutritionMenuRow | null;
  onSuccess: () => void;
}

const DAY_CONTEXT_OPTIONS = [
  { value: "treino", label: "Treino" },
  { value: "jogo", label: "Jogo" },
  { value: "folga", label: "Folga" },
];

export function NutritionMenuFormDialog({
  open,
  onOpenChange,
  tenants,
  categories,
  tenantId,
  ensureCategoriesForTenant,
  edit,
  onSuccess,
}: NutritionMenuFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tId, setTId] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("__none__");
  const [dayContext, setDayContext] = useState<string>("__none__");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [notes, setNotes] = useState("");

  const tenantCategories = categories.filter((c) => c.tenant.id === (edit ? edit.tenant.id : tId || tenantId));
  /** Opções de categoria na mesma ordem do menu Cadastros > Futebol > Categorias */
  const categoryOptions = [
    { value: "__none__", label: "Geral" },
    ...FIXTURE_CATEGORIES.map((cat) => {
      const c = tenantCategories.find((tc) => tc.code === cat.value);
      return c ? { value: c.id, label: getCategoryLabel(cat.value, "pt") } : null;
    }).filter((x): x is { value: string; label: string } => x != null),
  ];

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTId(edit.tenant.id);
      setName(edit.name);
      setCategoryId(edit.categoryId ?? "__none__");
      setDayContext(edit.dayContext ?? "__none__");
      setValidFrom(edit.validFrom ? edit.validFrom.slice(0, 10) : "");
      setValidTo(edit.validTo ? edit.validTo.slice(0, 10) : "");
      setNotes(edit.notes ?? "");
    } else {
      setTId(tenantId);
      setName("");
      setCategoryId("__none__");
      setDayContext("__none__");
      setValidFrom("");
      setValidTo("");
      setNotes("");
    }
  }, [open, edit, tenantId, categories]);

  /** Garante categorias do clube selecionado (Principal, Sub-17, etc.) para o dropdown */
  useEffect(() => {
    if (!open || !ensureCategoriesForTenant) return;
    const tid = edit ? edit.tenant.id : tId || tenantId;
    if (!tid) return;
    const forTenant = categories.filter((c) => c.tenant.id === tid);
    if (forTenant.length === 0) void ensureCategoriesForTenant(tid);
  }, [open, ensureCategoriesForTenant, edit, tId, tenantId, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tId?.trim() || !name?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenantId: tId,
        name: name.trim(),
        categoryId: categoryId === "__none__" ? undefined : categoryId,
        dayContext: dayContext === "__none__" ? undefined : dayContext,
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
        notes: notes.trim() || undefined,
      };
      if (edit) {
        await api.patch(`/nutricao/nutrition-menus/${edit.id}`, {
          name: payload.name,
          categoryId: categoryId === "__none__" ? null : categoryId,
          dayContext: dayContext === "__none__" ? null : dayContext,
          validFrom: validFrom || null,
          validTo: validTo || null,
          notes: notes.trim() || null,
        });
      } else {
        await api.post("/nutricao/nutrition-menus", payload);
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
            <DialogTitle>{edit ? "Editar cardápio" : "Novo cardápio"}</DialogTitle>
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
              <Label htmlFor="nm-name">Nome *</Label>
              <Input
                id="nm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Cardápio Semana 1 - Sub-17"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categoryOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
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
                <option value="__none__">Qualquer</option>
                {DAY_CONTEXT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nm-from">Vigência de</Label>
                <Input
                  id="nm-from"
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nm-to">Vigência até</Label>
                <Input
                  id="nm-to"
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nm-notes">Observações</Label>
              <textarea
                id="nm-notes"
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
