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
import { getCategoryLabel, FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import type { NutritionCategoryRow } from "./NutritionCategoryFormDialog";

export interface SupplementGuideRow {
  id: string;
  tenantId: string;
  categoryId: string | null;
  playerId: string | null;
  name: string;
  whenToTake: string | null;
  notes: string | null;
  tenant: { id: string; name: string };
  category?: { id: string; name: string } | null;
  player?: { id: string; name: string; jerseyNumber: number | null; category?: string | null } | null;
}

interface PlayerOption {
  id: string;
  name: string;
  jerseyNumber: number | null;
  category?: string | null;
}

interface SupplementGuideFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  categories: NutritionCategoryRow[];
  players: PlayerOption[];
  tenantId: string;
  ensureCategoriesForTenant?: (tenantId: string) => Promise<void>;
  edit?: SupplementGuideRow | null;
  onSuccess: () => void;
}

type Scope = "time" | "categoria" | "jogador";

export function SupplementGuideFormDialog({
  open,
  onOpenChange,
  tenants,
  categories,
  players,
  tenantId,
  ensureCategoriesForTenant,
  edit,
  onSuccess,
}: SupplementGuideFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tId, setTId] = useState("");
  const [scope, setScope] = useState<Scope>("time");
  const [categoryId, setCategoryId] = useState<string>("__none__");
  const [playerId, setPlayerId] = useState<string>("__none__");
  const [name, setName] = useState("");
  const [whenToTake, setWhenToTake] = useState("");
  const [notes, setNotes] = useState("");

  const tenantCategories = categories.filter((c) => c.tenant.id === (tId || tenantId));
  /** Opções de categoria na mesma ordem do menu Cadastros > Futebol > Categorias */
  const categoryOptions = [
    { value: "", label: "Selecione" },
    ...FIXTURE_CATEGORIES.map((cat) => {
      const c = tenantCategories.find((tc) => tc.code === cat.value);
      return c ? { value: c.id, label: getCategoryLabel(cat.value, "pt") } : null;
    }).filter((x): x is { value: string; label: string } => x != null),
  ];

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTId(edit.tenant.id);
      if (edit.playerId) {
        setScope("jogador");
        setPlayerId(edit.playerId);
        setCategoryId("__none__");
      } else if (edit.categoryId) {
        setScope("categoria");
        setCategoryId(edit.categoryId);
        setPlayerId("__none__");
      } else {
        setScope("time");
        setCategoryId("__none__");
        setPlayerId("__none__");
      }
      setName(edit.name);
      setWhenToTake(edit.whenToTake ?? "");
      setNotes(edit.notes ?? "");
    } else {
      setTId(tenantId);
      setScope("time");
      setCategoryId("__none__");
      setPlayerId("__none__");
      setName("");
      setWhenToTake("");
      setNotes("");
    }
  }, [open, edit, tenantId]);

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
    if (scope === "categoria" && (!categoryId || categoryId === "__none__")) return;
    if (scope === "jogador" && (!playerId || playerId === "__none__")) return;
    setSaving(true);
    try {
      const payload = {
        tenantId: tId,
        name: name.trim(),
        whenToTake: whenToTake.trim() || undefined,
        notes: notes.trim() || undefined,
        categoryId: scope === "categoria" && categoryId !== "__none__" ? categoryId : undefined,
        playerId: scope === "jogador" && playerId !== "__none__" ? playerId : undefined,
      };
      if (edit) {
        await api.patch(`/nutricao/supplement-guides/${edit.id}`, {
          categoryId: scope === "categoria" && categoryId !== "__none__" ? categoryId : null,
          playerId: scope === "jogador" && playerId !== "__none__" ? playerId : null,
          name: payload.name,
          whenToTake: payload.whenToTake ?? null,
          notes: payload.notes ?? null,
        });
      } else {
        await api.post("/nutricao/supplement-guides", {
          ...payload,
          categoryId: scope === "categoria" && categoryId !== "__none__" ? categoryId : undefined,
          playerId: scope === "jogador" && playerId !== "__none__" ? playerId : undefined,
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
            <DialogTitle>{edit ? "Editar guia" : "Novo guia de suplementação"}</DialogTitle>
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
              <Label>Escopo (time todo, categoria ou jogador)</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={scope}
                onChange={(e) => {
                  const v = e.target.value as Scope;
                  setScope(v);
                  if (v === "categoria") setCategoryId("");
                  else if (v === "jogador") setPlayerId("__none__");
                }}
              >
                <option value="time">Time todo</option>
                <option value="categoria">Categoria</option>
                <option value="jogador">Jogador</option>
              </select>
            </div>
            {scope === "categoria" && (
              <div className="grid gap-2">
                <Label>Categoria *</Label>
              <select
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                  {categoryOptions.map((o) => (
                    <option key={o.value || "__select__"} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
            {scope === "jogador" && (
              <div className="grid gap-2">
                <Label>Jogador *</Label>
                <select
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.jerseyNumber != null ? `#${p.jerseyNumber}` : ""}
                      {p.category ? ` • ${getCategoryLabel(p.category, "pt")}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="sg-name">Nome *</Label>
              <Input
                id="sg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Whey protein, Creatina"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sg-when">Quando tomar</Label>
              <Input
                id="sg-when"
                value={whenToTake}
                onChange={(e) => setWhenToTake(e.target.value)}
                placeholder="Ex.: Pós-treino, antes do jogo"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sg-notes">Observações</Label>
              <textarea
                id="sg-notes"
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
