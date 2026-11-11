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
import { FeedbackModal } from "@/components/ui/feedback-modal";

export interface SupplierRow {
  id: string;
  name: string;
  document?: string | null;
  personType?: string | null;
  tradeName?: string | null;
  taxId?: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp?: string | null;
  website?: string | null;
  address?: string | null;
  country?: string | null;
  status?: string;
  supplierCategoryId?: string | null;
  notes: string | null;
  tenant: { id: string; name: string; slug: string };
}

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  categories?: Array<{ id: string; name: string }>;
  edit?: SupplierRow | null;
  onSuccess: () => void;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  tenants,
  categories = [],
  edit,
  onSuccess,
}: SupplierFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [personType, setPersonType] = useState<"" | "pj" | "pf">("");
  const [tradeName, setTradeName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [supplierCategoryId, setSupplierCategoryId] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setName(edit.name);
      setDocument(edit.document ?? "");
      setPersonType((edit.personType as "" | "pj" | "pf") ?? "");
      setTradeName(edit.tradeName ?? "");
      setTaxId(edit.taxId ?? "");
      setContactName(edit.contactName ?? "");
      setEmail(edit.email ?? "");
      setPhone(edit.phone ?? "");
      setWhatsapp(edit.whatsapp ?? "");
      setWebsite(edit.website ?? "");
      setCountry(edit.country ?? "");
      setSupplierCategoryId(edit.supplierCategoryId ?? "");
      setAddress(edit.address ?? "");
      setNotes(edit.notes ?? "");
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setName("");
      setDocument("");
      setPersonType("");
      setTradeName("");
      setTaxId("");
      setContactName("");
      setEmail("");
      setPhone("");
      setWhatsapp("");
      setWebsite("");
      setCountry("");
      setSupplierCategoryId("");
      setAddress("");
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
        personType: personType || undefined,
        document: document.trim() || undefined,
        tradeName: tradeName.trim() || undefined,
        taxId: taxId.trim() || undefined,
        contactName: contactName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        website: website.trim() || undefined,
        country: country.trim() || undefined,
        supplierCategoryId: supplierCategoryId || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (edit) {
        await api.patch(`/compras/suppliers/${edit.id}`, payload);
      } else {
        await api.post("/compras/suppliers", { tenantId, ...payload });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Erro ao salvar",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="supplier-type">Tipo</Label>
                <select
                  id="supplier-type"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={personType}
                  onChange={(e) => setPersonType(e.target.value as "" | "pj" | "pf")}
                >
                  <option value="">—</option>
                  <option value="pj">Pessoa jurídica</option>
                  <option value="pf">Pessoa física</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier-category">Categoria</Label>
                <select
                  id="supplier-category"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={supplierCategoryId}
                  onChange={(e) => setSupplierCategoryId(e.target.value)}
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier-trade">Nome fantasia</Label>
              <Input id="supplier-trade" value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="supplier-document">CNPJ / CPF</Label>
                <Input id="supplier-document" value={document} onChange={(e) => setDocument(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier-tax">EIN / Tax ID</Label>
                <Input id="supplier-tax" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
              </div>
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
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="supplier-phone">Telefone</Label>
                <Input id="supplier-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier-whatsapp">WhatsApp</Label>
                <Input id="supplier-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="supplier-website">Site</Label>
                <Input id="supplier-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier-country">País</Label>
                <Input id="supplier-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="BR, US…" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier-address">Endereço</Label>
              <textarea
                id="supplier-address"
                className="min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, cidade"
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
      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </Dialog>
  );
}
