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

export interface DepartmentRow {
  id: string;
  name: string;
  code: string | null;
  tenant: { id: string; name: string; slug: string };
}

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  edit?: DepartmentRow | null;
  onSuccess: () => void;
}

export function DepartmentFormDialog({
  open,
  onOpenChange,
  tenants,
  edit,
  onSuccess,
}: DepartmentFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setName(edit.name);
      setCode(edit.code ?? "");
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setName("");
      setCode("");
    }
  }, [open, edit, tenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !name?.trim()) return;
    setSaving(true);
    try {
      if (edit) {
        await api.patch(`/rh/departments/${edit.id}`, { name: name.trim(), code: code.trim() || undefined });
      } else {
        await api.post("/rh/departments", { tenantId, name: name.trim(), code: code.trim() || undefined });
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
            <DialogTitle>{edit ? "Editar departamento" : "Novo departamento"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dept-tenant">Clube/Empresa *</Label>
              <select
                id="dept-tenant"
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
              <Label htmlFor="dept-name">Nome *</Label>
              <Input
                id="dept-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Futebol Profissional"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dept-code">Código</Label>
              <Input
                id="dept-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex.: FUT-PRO"
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
