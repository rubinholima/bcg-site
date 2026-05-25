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
import { PhotoUploadWithName } from "@/components/dashboard/PhotoUploadWithName";
import { api } from "@/lib/api";
import { formatCpfForDisplay, formatCpfInput } from "@/lib/format-cpf";
import { formatPhoneForDisplay } from "@/lib/format-phone";
import { EMPLOYEE_TYPES } from "@/lib/employee-types";
import { getPhotoDisplayName, PHOTO_DEPARTMENT_BY_SIZE_KEY } from "@/lib/utils";
import { Tenant } from "@/types/tenant";

export interface EmployeeRow {
  id: string;
  name: string;
  cpf: string | null;
  rg: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  type: string;
  categories: string[] | null;
  notes: string | null;
  photoUrl: string | null;
  tenant: { id: string; name: string; slug: string };
}

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  edit?: EmployeeRow | null;
  onSuccess: () => void;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  tenants,
  edit,
  onSuccess,
}: EmployeeFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [type, setType] = useState("staff");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setName(edit.name);
      setCpf(formatCpfForDisplay(edit.cpf));
      setRg((edit.rg ?? "").toLocaleUpperCase("pt-BR"));
      setEmail(edit.email ?? "");
      setPhone(formatPhoneForDisplay(edit.phone));
      setBirthDate(edit.birthDate ? edit.birthDate.slice(0, 10) : "");
      setType(edit.type);
      setNotes((edit.notes ?? "").toLocaleUpperCase("pt-BR"));
      setPhotoUrl(edit.photoUrl ?? "");
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setName("");
      setCpf("");
      setRg("");
      setEmail("");
      setPhone("");
      setBirthDate("");
      setType("staff");
      setNotes("");
      setPhotoUrl("");
    }
  }, [open, edit, tenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !name?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenantId,
        name: name.trim().toLocaleUpperCase("pt-BR"),
        cpf: cpf.trim() || undefined,
        rg: rg.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        birthDate: birthDate || undefined,
        type,
        notes: notes.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
      };
      if (edit) {
        await api.patch(`/rh/employees/${edit.id}`, payload);
      } else {
        await api.post("/rh/employees", payload);
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{edit ? "Editar colaborador" : "Novo colaborador"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="emp-tenant">Clube/Empresa *</Label>
              <select
                id="emp-tenant"
                required
                disabled={!!edit}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground uppercase"
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
              <Label htmlFor="emp-name">Nome *</Label>
              <Input
                id="emp-name"
                value={name}
                onChange={(e) => setName(e.target.value.toLocaleUpperCase("pt-BR"))}
                placeholder="NOME COMPLETO"
                className="uppercase"
                required
              />
            </div>
            <div className="grid gap-2 border-t border-border pt-4">
              <Label>Foto</Label>
              <PhotoUploadWithName
                sizeKey="rh"
                value={photoUrl}
                onChange={setPhotoUrl}
                placeholder="Escolher da biblioteca"
                urlPlaceholder="URL da foto"
                allowAllFolders
                uploadFolderHint="rh"
                displayNameAuto={
                  name.trim()
                    ? getPhotoDisplayName(name, PHOTO_DEPARTMENT_BY_SIZE_KEY.rh)
                    : undefined
                }
                showAutomaticPhotoNameNote={false}
                showFileFormatHint={false}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-type">Tipo *</Label>
              <select
                id="emp-type"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="staff">{EMPLOYEE_TYPES.staff}</option>
                <option value="dirigente">{EMPLOYEE_TYPES.dirigente}</option>
                <option value="athlete">{EMPLOYEE_TYPES.athlete}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="emp-cpf">CPF</Label>
                <Input
                  id="emp-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpfInput(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emp-rg">RG</Label>
                <Input
                  id="emp-rg"
                  value={rg}
                  onChange={(e) => setRg(e.target.value.toLocaleUpperCase("pt-BR"))}
                  placeholder="RG"
                  className="uppercase"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-birthDate">Data de nascimento</Label>
              <Input
                id="emp-birthDate"
                type="date"
                className="text-foreground"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-email">E-mail</Label>
              <Input
                id="emp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-phone">Telefone</Label>
              <Input
                id="emp-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={(e) => setPhone(formatPhoneForDisplay(e.target.value))}
                placeholder="(11) 99999-9999"
                inputMode="tel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-notes">Observações</Label>
              <textarea
                id="emp-notes"
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground uppercase"
                value={notes}
                onChange={(e) => setNotes(e.target.value.toLocaleUpperCase("pt-BR"))}
                placeholder="OBSERVAÇÕES"
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
