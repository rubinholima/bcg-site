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

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setName(edit.name);
      setCpf(edit.cpf ?? "");
      setRg(edit.rg ?? "");
      setEmail(edit.email ?? "");
      setPhone(edit.phone ?? "");
      setBirthDate(edit.birthDate ? edit.birthDate.slice(0, 10) : "");
      setType(edit.type);
      setNotes(edit.notes ?? "");
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
    }
  }, [open, edit, tenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !name?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenantId,
        name: name.trim(),
        cpf: cpf.trim() || undefined,
        rg: rg.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        birthDate: birthDate || undefined,
        type,
        notes: notes.trim() || undefined,
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
              <Label htmlFor="emp-name">Nome *</Label>
              <Input
                id="emp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
                required
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
                <option value="staff">Staff (funcionário)</option>
                <option value="athlete">Atleta</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="emp-cpf">CPF</Label>
                <Input
                  id="emp-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emp-rg">RG</Label>
                <Input id="emp-rg" value={rg} onChange={(e) => setRg(e.target.value)} placeholder="RG" />
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-phone">Telefone</Label>
              <Input
                id="emp-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-notes">Observações</Label>
              <textarea
                id="emp-notes"
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações"
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
