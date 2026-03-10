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

export interface SupplierRow {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tenant: { id: string; name: string; slug: string };
}

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  edit?: SupplierRow | null;
  onSuccess: () => void;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  tenants,
  edit,
  onSuccess,
}: SupplierFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setName(edit.name);
      setContactName(edit.contactName ?? "");
      setEmail(edit.email ?? "");
      setPhone(edit.phone ?? "");
      setNotes(edit.notes ?? "");
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setName("");
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
      if (edit) {
        await api.patch(`/compras/suppliers/${edit.id}`, {
          name: name.trim(),
          contactName: contactName.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await api.post("/compras/suppliers", {
          tenantId,
          name: name.trim(),
          contactName: contactName.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
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
            <DialogTitle>{edit ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="supplier-tenant">Clube/Empresa *</Label>
              <select
                id="supplier-tenant"
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
              <Label htmlFor="supplier-name">Nome *</Label>
              <Input
                id="supplier-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do fornecedor"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier-contact">Nome do contato</Label>
              <Input
                id="supplier-contact"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nome do contato"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier-email">E-mail</Label>
              <Input
                id="supplier-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier-phone">Telefone</Label>
              <Input
                id="supplier-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier-notes">Observações</Label>
              <textarea
                id="supplier-notes"
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
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
