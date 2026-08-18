"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import type { NutritionMenuRow } from "@/app/dashboard/adm/nutricao/components/NutritionMenuFormDialog";
import type { NutritionMealTypeRow } from "@/app/dashboard/adm/nutricao/components/NutritionMealTypeFormDialog";

interface MenuItemRow {
  id: string;
  description: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatsG: number | null;
  sortOrder: number;
  mealType: { id: string; name: string; code: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: NutritionMenuRow | null;
  mealTypes: NutritionMealTypeRow[];
  onSuccess?: () => void;
}

export function NutritionMenuItemsDialog({ open, onOpenChange, menu, mealTypes, onSuccess }: Props) {
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    mealTypeId: "",
    description: "",
    calories: "",
    proteinG: "",
    carbsG: "",
    fatsG: "",
  });
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const loadItems = useCallback(async () => {
    if (!menu?.id) return;
    setLoading(true);
    try {
      const { data } = await api.get<MenuItemRow[]>(`/nutricao/nutrition-menus/${menu.id}/items`);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [menu?.id]);

  useEffect(() => {
    if (open && menu?.id) loadItems();
  }, [open, menu?.id, loadItems]);

  const handleAdd = async () => {
    if (!menu?.id || !draft.mealTypeId || !draft.description.trim()) return;
    setSaving(true);
    try {
      await api.post(`/nutricao/nutrition-menus/${menu.id}/items`, {
        mealTypeId: draft.mealTypeId,
        description: draft.description.trim(),
        calories: draft.calories ? Number(draft.calories) : undefined,
        proteinG: draft.proteinG ? Number(draft.proteinG) : undefined,
        carbsG: draft.carbsG ? Number(draft.carbsG) : undefined,
        fatsG: draft.fatsG ? Number(draft.fatsG) : undefined,
      });
      setDraft({ mealTypeId: draft.mealTypeId, description: "", calories: "", proteinG: "", carbsG: "", fatsG: "" });
      await loadItems();
      onSuccess?.();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível adicionar o item.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/nutricao/nutrition-menus/items/${deleteId}`);
      setDeleteId(null);
      await loadItems();
      onSuccess?.();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível excluir.",
      });
    }
  };

  const tenantMealTypes = mealTypes.filter((m) => m.tenant.id === menu?.tenant.id);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Itens — {menu?.name ?? "Cardápio"}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-2">Refeição</th>
                      <th className="p-2">Prato</th>
                      <th className="p-2">kcal</th>
                      <th className="p-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-muted-foreground">
                          Nenhum item cadastrado.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} className="border-b border-border/50">
                          <td className="p-2 whitespace-nowrap">{item.mealType.name}</td>
                          <td className="p-2">{item.description}</td>
                          <td className="p-2">{item.calories ?? "—"}</td>
                          <td className="p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteId(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 border rounded-lg p-3">
                <div className="sm:col-span-2 grid gap-1">
                  <Label>Tipo de refeição</Label>
                  <NativeSelectField
                    value={draft.mealTypeId}
                    onChange={(e) => setDraft((d) => ({ ...d, mealTypeId: e.target.value }))}
                    placeholder="Selecione…"
                    options={tenantMealTypes.map((m) => ({ value: m.id, label: m.name }))}
                  />
                </div>
                <div className="sm:col-span-2 grid gap-1">
                  <Label>Prato / preparo</Label>
                  <Input
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    placeholder="Ex.: Arroz integral, frango grelhado…"
                  />
                </div>
                <div className="grid gap-1">
                  <Label>kcal</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.calories}
                    onChange={(e) => setDraft((d) => ({ ...d, calories: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Proteína (g)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={draft.proteinG}
                    onChange={(e) => setDraft((d) => ({ ...d, proteinG: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Carboidrato (g)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={draft.carbsG}
                    onChange={(e) => setDraft((d) => ({ ...d, carbsG: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Gordura (g)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={draft.fatsG}
                    onChange={(e) => setDraft((d) => ({ ...d, fatsG: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button type="button" onClick={handleAdd} disabled={saving || !draft.mealTypeId || !draft.description.trim()}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Adicionar item
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </>
  );
}
