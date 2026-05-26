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

export interface CustomerRow {
  id: string;
  name: string;
  document: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tenant: { id: string; name: string; slug: string };
}

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  edit?: CustomerRow | null;
  onSuccess: () => void;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  tenants,
  edit,
  onSuccess,
}: CustomerFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setName(edit.name);
      setDocument(edit.document ?? "");
      setContactName(edit.contactName ?? "");
      setEmail(edit.email ?? "");
      setPhone(edit.phone ?? "");
      setNotes(edit.notes ?? "");
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setName("");
      setDocument("");
      setContactName("");
      setEmail("");
      setPhone("");
      setNotes("");
    }
  }, [open, edit, tenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !name?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        document: document.trim() || undefined,
        contactName: contactName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (edit) {
        await api.patch(`/financeiro/customers/${edit.id}`, payload);
      } else {
        await api.post("/financeiro/customers", { tenantId, ...payload });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{edit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="customer-tenant">Clube/Empresa *</Label>
              <select
                id="customer-tenant"
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
              <Label htmlFor="customer-name">Nome / Razão social *</Label>
              <Input id="customer-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer-document">CPF / CNPJ</Label>
              <Input id="customer-document" value={document} onChange={(e) => setDocument(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer-contact">Contato</Label>
              <Input id="customer-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer-email">E-mail</Label>
              <Input id="customer-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer-phone">Telefone</Label>
              <Input id="customer-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer-notes">Observações</Label>
              <textarea
                id="customer-notes"
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
