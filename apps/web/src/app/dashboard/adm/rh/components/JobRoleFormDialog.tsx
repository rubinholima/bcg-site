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
import { type DepartmentRow } from "./DepartmentFormDialog";

export interface JobRoleRow {
  id: string;
  name: string;
  code: string | null;
  type: string;
  departmentId: string | null;
  department: { id: string; name: string; code: string | null } | null;
  tenant: { id: string; name: string; slug: string };
}

interface JobRoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  departments: DepartmentRow[];
  edit?: JobRoleRow | null;
  onSuccess: () => void;
}

export function JobRoleFormDialog({
  open,
  onOpenChange,
  tenants,
  departments,
  edit,
  onSuccess,
}: JobRoleFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("staff");

  const tenantDepts = departments.filter((d) => d.tenant.id === tenantId);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setDepartmentId(edit.departmentId ?? "");
      setName(edit.name);
      setCode(edit.code ?? "");
      setType(edit.type);
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setDepartmentId("");
      setName("");
      setCode("");
      setType("staff");
    }
  }, [open, edit, tenants, departments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !name?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenantId,
        departmentId: departmentId || undefined,
        name: name.trim(),
        code: code.trim() || undefined,
        type,
      };
      if (edit) {
        await api.patch(`/rh/job-roles/${edit.id}`, payload);
      } else {
        await api.post("/rh/job-roles", payload);
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
            <DialogTitle>{edit ? "Editar cargo" : "Novo cargo"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role-tenant">Clube/Empresa *</Label>
              <select
                id="role-tenant"
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
              <Label htmlFor="role-department">Departamento</Label>
              <select
                id="role-department"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">Nenhum</option>
                {tenantDepts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-name">Nome *</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Auxiliar Administrativo"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="role-code">Código</Label>
                <Input
                  id="role-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex.: AUX-ADM"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role-type">Tipo *</Label>
                <select
                  id="role-type"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="staff">Staff (funcionário)</option>
                  <option value="athlete">Atleta</option>
                </select>
              </div>
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
