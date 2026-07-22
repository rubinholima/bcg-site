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
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { NativeSelect } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import type { InventoryCategoryRow } from "@/lib/inventory-kinds";

interface InventoryCategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  edit?: InventoryCategoryRow | null;
  defaultTenantId?: string;
  onSuccess: (savedTenantId: string) => void;
}

export function InventoryCategoryFormDialog({
  open,
  onOpenChange,
  tenants,
  edit,
  defaultTenantId,
  onSuccess,
}: InventoryCategoryFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant?.id ?? "");
      setName(edit.name);
    } else {
      setTenantId(defaultTenantId?.trim() || tenants[0]?.id || "");
      setName("");
    }
  }, [open, edit, tenants, defaultTenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !name?.trim()) return;
    setSaving(true);
    try {
      if (edit) {
        await api.patch(`/compras/inventory-categories/${edit.id}`, { name: name.trim() });
        onSuccess(edit.tenant?.id ?? tenantId);
      } else {
        await api.post("/compras/inventory-categories", { tenantId, name: name.trim() });
        onSuccess(tenantId);
      }
      onOpenChange(false);
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro ao salvar",
        message: err instanceof Error ? err.message : "Não foi possível salvar a categoria.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full min-w-0 sm:max-w-md max-h-[min(90vh,100dvh-2rem)] overflow-y-auto text-foreground">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{edit ? "Editar categoria" : "Nova categoria"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="invcat-tenant">Clube/Empresa *</Label>
                <NativeSelect
                  id="invcat-tenant"
                  required
                  disabled={!!edit}
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invcat-name">Nome *</Label>
                <Input
                  id="invcat-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Uniforme de treino, Jogo, Saúde, Outros…"
                  required
                  disabled={!!edit?.isSystem}
                />
              </div>
              {edit?.isSystem ? (
                <p className="text-xs text-muted-foreground">
                  Categorias do sistema não podem ser renomeadas aqui — cadastre uma nova se precisar de outro nome.
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !!edit?.isSystem}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {edit ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
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

export type { InventoryCategoryRow };
