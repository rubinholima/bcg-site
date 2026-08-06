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
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { NativeSelect } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { type DepartmentRow } from "./DepartmentFormDialog";

export interface JobRoleRow {
  id: string;
  name: string;
  code: string | null;
  type: string;
  forFootball?: boolean;
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
  /** Força cargo de futebol (tela Cadastros → Funções) */
  forceFootball?: boolean;
}

export function JobRoleFormDialog({
  open,
  onOpenChange,
  tenants,
  departments,
  edit,
  onSuccess,
  forceFootball = false,
}: JobRoleFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("staff");
  const [forFootball, setForFootball] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "error" });

  const tenantDepts = departments.filter((d) => d.tenant.id === tenantId);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setDepartmentId(edit.departmentId ?? "");
      setName(edit.name);
      setCode(edit.code ?? "");
      setType(forceFootball ? "staff" : edit.type);
      setForFootball(forceFootball || edit.forFootball === true);
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setDepartmentId("");
      setName("");
      setCode("");
      setType("staff");
      setForFootball(forceFootball);
    }
  }, [open, edit, tenants, departments, forceFootball]);

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
        type: forceFootball ? "staff" : type,
        forFootball: forceFootball || forFootball,
      };
      if (edit) {
        await api.patch(`/rh/job-roles/${edit.id}`, payload);
      } else {
        await api.post("/rh/job-roles", payload);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      const text = Array.isArray(msg) ? msg.join(", ") : msg;
      setFeedback({
        open: true,
        title: "Erro",
        message: text || "Não foi possível salvar o cargo.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <form onSubmit={(e) => void handleSubmit(e)}>
            <DialogHeader>
              <DialogTitle>
                {edit
                  ? forceFootball
                    ? "Editar função"
                    : "Editar cargo"
                  : forceFootball
                    ? "Nova função"
                    : "Novo cargo"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="role-tenant">Clube/Empresa *</Label>
                <NativeSelect
                  id="role-tenant"
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
                <Label htmlFor="role-department">Departamento</Label>
                <NativeSelect
                  id="role-department"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">Nenhum</option>
                  {tenantDepts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role-name">Nome *</Label>
                <Input
                  id="role-name"
                  className="min-h-[44px] uppercase text-foreground"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    forceFootball ? "Ex.: Preparador físico" : "Ex.: Auxiliar Administrativo"
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="role-code">Código</Label>
                  <Input
                    id="role-code"
                    className="min-h-[44px] uppercase text-foreground"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ex.: PREP-FIS"
                  />
                </div>
                {!forceFootball ? (
                  <div className="grid gap-2">
                    <Label htmlFor="role-type">Tipo *</Label>
                    <NativeSelect
                      id="role-type"
                      required
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="staff">Staff (funcionário)</option>
                      <option value="athlete">Atleta</option>
                    </NativeSelect>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <p className="flex min-h-[44px] items-center text-sm text-muted-foreground">
                      Staff (comissão)
                    </p>
                  </div>
                )}
              </div>
              {!forceFootball ? (
                <label className="flex min-h-[44px] items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={forFootball}
                    onChange={(e) => setForFootball(e.target.checked)}
                  />
                  Usar no futebol (comissão / funções)
                </label>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="min-h-[44px]">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {edit ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </>
  );
}
