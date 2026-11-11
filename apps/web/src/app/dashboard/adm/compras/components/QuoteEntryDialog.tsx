"use client";

import { useEffect, useMemo, useState } from "react";
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
import { NativeSelect } from "@/components/ui/native-select";
import type { SupplierRow } from "./SupplierFormDialog";
import { getPublicImageUrl } from "@/lib/media-url";
import { MediaPicker } from "@/components/dashboard/MediaPicker";

type ReqItem = { description: string; quantity: number; unit?: string; productId?: string };

function computeSubtotal(lines: Array<{ quantity: number; unitPrice: string }>) {
  return lines.reduce((s, l) => {
    const q = l.quantity || 0;
    const p = parseFloat(l.unitPrice.replace(",", ".")) || 0;
    return s + q * p;
  }, 0);
}

function computeGrand(
  subtotal: number,
  tax: string,
  shipping: string,
  discount: string,
  other: string,
) {
  const t = parseFloat(tax.replace(",", ".")) || 0;
  const sh = parseFloat(shipping.replace(",", ".")) || 0;
  const d = parseFloat(discount.replace(",", ".")) || 0;
  const o = parseFloat(other.replace(",", ".")) || 0;
  return Math.max(0, Math.round((subtotal + t + sh + o - d) * 100) / 100);
}

export function QuoteEntryDialog({
  open,
  onOpenChange,
  requisitionItems,
  suppliers,
  tenantId,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  requisitionItems: ReqItem[];
  suppliers: SupplierRow[];
  tenantId: string;
  saving: boolean;
  onSubmit: (payload: {
    supplierId?: string;
    supplierName: string;
    items: Array<{
      description: string;
      quantity: number;
      unit?: string;
      unitPrice: number;
    }>;
    pricingBreakdown: { tax?: number; shipping?: number; discount?: number; otherCosts?: number };
    totalAmount: number;
    deliveryDays?: number;
    paymentTerms?: string;
    validUntil?: string;
    notes?: string;
    attachmentUrl?: string;
  }) => Promise<void>;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [linePrices, setLinePrices] = useState<string[]>([]);
  const [tax, setTax] = useState("");
  const [shipping, setShipping] = useState("");
  const [discount, setDiscount] = useState("");
  const [otherCosts, setOtherCosts] = useState("");
  const [delivery, setDelivery] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [attachmentKey, setAttachmentKey] = useState("");

  useEffect(() => {
    if (!open) return;
    setLinePrices(requisitionItems.map(() => ""));
    setSupplierId("");
    setSupplierName("");
    setTax("");
    setShipping("");
    setDiscount("");
    setOtherCosts("");
    setDelivery("");
    setPaymentTerms("");
    setValidUntil("");
    setNotes("");
    setAttachmentKey("");
  }, [open, requisitionItems]);

  const lines = useMemo(
    () =>
      requisitionItems.map((item, i) => ({
        ...item,
        unitPrice: linePrices[i] ?? "",
      })),
    [requisitionItems, linePrices],
  );

  const subtotal = computeSubtotal(lines);
  const grandTotal = computeGrand(subtotal, tax, shipping, discount, otherCosts);

  const handleSave = async () => {
    if (!supplierName.trim()) return;
    const items = lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unit: l.unit ?? "un",
      unitPrice: parseFloat(l.unitPrice.replace(",", ".")) || 0,
    }));
    await onSubmit({
      supplierId: supplierId || undefined,
      supplierName: supplierName.trim(),
      items,
      pricingBreakdown: {
        tax: parseFloat(tax.replace(",", ".")) || 0,
        shipping: parseFloat(shipping.replace(",", ".")) || 0,
        discount: parseFloat(discount.replace(",", ".")) || 0,
        otherCosts: parseFloat(otherCosts.replace(",", ".")) || 0,
      },
      totalAmount: grandTotal,
      deliveryDays: delivery ? parseInt(delivery, 10) : undefined,
      paymentTerms: paymentTerms.trim() || undefined,
      validUntil: validUntil || undefined,
      notes: notes.trim() || undefined,
      attachmentUrl: attachmentKey ? getPublicImageUrl(attachmentKey) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[min(40rem,calc(100vw-1.5rem))]">
        <DialogHeader>
          <DialogTitle>Proposta do fornecedor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label>Fornecedor cadastrado</Label>
            <NativeSelect
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                const s = suppliers.find((x) => x.id === e.target.value);
                if (s) setSupplierName(s.name);
              }}
            >
              <option value="">— ou nome manual —</option>
              {suppliers
                .filter((s) => !tenantId || s.tenant?.id === tenantId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label>Nome do fornecedor *</Label>
            <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="uppercase" />
          </div>

          <p className="text-sm font-medium text-foreground">Itens</p>
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={`${line.description}-${i}`} className="grid gap-2 rounded-md border border-border p-3">
                <p className="text-sm font-medium">{line.description}</p>
                <p className="text-xs text-muted-foreground">
                  Qtd: {line.quantity} {line.unit ?? "un"}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label>Preço unitário</Label>
                    <Input
                      inputMode="decimal"
                      value={linePrices[i] ?? ""}
                      onChange={(e) => {
                        const next = [...linePrices];
                        next[i] = e.target.value;
                        setLinePrices(next);
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <p className="text-sm tabular-nums text-muted-foreground">
                      Subtotal:{" "}
                      {(
                        line.quantity * (parseFloat((linePrices[i] ?? "").replace(",", ".")) || 0)
                      ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Impostos / taxas</Label>
              <Input inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Frete</Label>
              <Input inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Desconto</Label>
              <Input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Outros custos</Label>
              <Input inputMode="decimal" value={otherCosts} onChange={(e) => setOtherCosts(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md bg-muted/40 px-3 py-2 text-sm flex justify-between">
            <span>Subtotal itens</span>
            <span className="tabular-nums font-medium">
              {subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
          <div className="rounded-md bg-primary/10 px-3 py-2 text-sm flex justify-between">
            <span>Total geral</span>
            <span className="tabular-nums font-semibold text-foreground">
              {grandTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Prazo entrega (dias)</Label>
              <Input type="number" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Validade da proposta</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Condições de pagamento</Label>
            <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Observações</Label>
            <textarea
              className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Anexo (PDF / proposta)</Label>
            <MediaPicker
              sizeKey="section_bg"
              allowAllFolders
              value={attachmentKey}
              onChange={(key) => setAttachmentKey(key ?? "")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={saving || !supplierName.trim()} onClick={() => void handleSave()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar proposta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
