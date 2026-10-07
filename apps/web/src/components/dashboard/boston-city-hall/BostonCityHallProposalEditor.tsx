"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Copy, FileDown, FileSignature, Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type {
  VenueBooking,
  VenueCatalogPackage,
  VenueCatalogService,
  VenuePipelineLead,
  VenueProposal,
} from "@/types/boston-city-hall";
import {
  formatCatalogMoney,
  parseProposalDateInput,
  VENUE_PROPOSAL_STATUSES,
  VENUE_PROPOSAL_STATUS_LABEL,
} from "@/types/boston-city-hall";
import { BCH_BASE } from "./boston-city-hall-lead-shared";

type ItemLine = {
  key: string;
  sourceType: "service" | "package" | "custom";
  sourceServiceId: string;
  sourcePackageId: string;
  name: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

function newKey() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function lineTotal(qty: string, unit: string): string {
  const q = Number.parseFloat(qty.replace(",", "."));
  const u = Number.parseFloat(unit.replace(",", "."));
  if (!Number.isFinite(q) || !Number.isFinite(u)) return "0.00";
  return (q * u).toFixed(2);
}

function itemsToPayload(lines: ItemLine[]) {
  return lines.map((ln, i) => {
    const base = {
      sourceType: ln.sourceType,
      quantity: ln.quantity || "1",
      sortOrder: i,
    };
    if (ln.sourceType === "service") {
      return { ...base, sourceServiceId: ln.sourceServiceId, unitPrice: ln.unitPrice || undefined };
    }
    if (ln.sourceType === "package") {
      return { ...base, sourcePackageId: ln.sourcePackageId, unitPrice: ln.unitPrice || undefined };
    }
    return {
      ...base,
      name: ln.name,
      description: ln.description || null,
      unitPrice: ln.unitPrice,
    };
  });
}

function proposalToLines(p: VenueProposal): ItemLine[] {
  return p.items.map((it) => ({
    key: it.id,
    sourceType: it.sourceType as ItemLine["sourceType"],
    sourceServiceId: it.sourceServiceId ?? "",
    sourcePackageId: it.sourcePackageId ?? "",
    name: it.name,
    description: it.description ?? "",
    quantity: it.quantity,
    unitPrice: it.unitPrice,
  }));
}

export function BostonCityHallProposalEditor({ proposalId }: { proposalId: string }) {
  const isNew = proposalId === "new";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [proposal, setProposal] = useState<VenueProposal | null>(null);

  const [services, setServices] = useState<VenueCatalogService[]>([]);
  const [packages, setPackages] = useState<VenueCatalogPackage[]>([]);
  const [leads, setLeads] = useState<VenuePipelineLead[]>([]);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [pipelineLeadId, setPipelineLeadId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [lines, setLines] = useState<ItemLine[]>([]);

  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const locked = !isNew && status !== "draft";

  const previewSubtotal = useMemo(() => {
    const sum = lines.reduce(
      (acc, ln) => acc + Number.parseFloat(lineTotal(ln.quantity, ln.unitPrice)),
      0,
    );
    return sum.toFixed(2);
  }, [lines]);

  const previewTotal = useMemo(() => {
    const sub = Number.parseFloat(previewSubtotal);
    const disc = Number.parseFloat(discount.replace(",", ".")) || 0;
    const taxV = Number.parseFloat(tax.replace(",", ".")) || 0;
    return Math.max(0, sub - disc + taxV).toFixed(2);
  }, [previewSubtotal, discount, tax]);

  const loadCatalog = useCallback(async () => {
    const [svc, pkg, pipe, book] = await Promise.all([
      api.get<VenueCatalogService[]>("/boston-city-hall/catalog/services?active=true"),
      api.get<VenueCatalogPackage[]>("/boston-city-hall/catalog/packages?active=true"),
      api.get<VenuePipelineLead[]>("/boston-city-hall/pipeline"),
      api.get<VenueBooking[]>("/boston-city-hall/bookings"),
    ]);
    setServices(Array.isArray(svc.data) ? svc.data : []);
    setPackages(Array.isArray(pkg.data) ? pkg.data : []);
    setLeads(Array.isArray(pipe.data) ? pipe.data : []);
    setBookings(Array.isArray(book.data) ? book.data : []);
  }, []);

  const applyLeadPrefill = useCallback((lead: VenuePipelineLead) => {
    setContactName(lead.contactName);
    setContactEmail(lead.contactEmail);
    setContactPhone(lead.contactPhone ?? "");
    setCompanyName(lead.companyName ?? "");
    setEventType(lead.eventType ?? "");
    setGuestCount(lead.guestCount != null ? String(lead.guestCount) : "");
    setEventDate(parseProposalDateInput(lead.preferredDate));
    if (!title) {
      setTitle(
        lead.companyName ? `Proposta — ${lead.companyName}` : `Proposta — ${lead.contactName}`,
      );
    }
  }, [title]);

  const loadProposal = useCallback(async () => {
    const res = await api.get<VenueProposal>(`/boston-city-hall/proposals/${proposalId}`);
    const p = res.data;
    setProposal(p);
    setTitle(p.title);
    setStatus(p.status);
    setPipelineLeadId(p.pipelineLeadId ?? "");
    setBookingId(p.bookingId ?? "");
    setContactName(p.contactName);
    setContactEmail(p.contactEmail);
    setContactPhone(p.contactPhone ?? "");
    setCompanyName(p.companyName ?? "");
    setEventType(p.eventType ?? "");
    setEventDate(parseProposalDateInput(p.eventDate));
    setGuestCount(p.guestCount != null ? String(p.guestCount) : "");
    setDiscount(p.discount);
    setTax(p.tax);
    setNotes(p.notes ?? "");
    setTerms(p.terms ?? "");
    setValidUntil(parseProposalDateInput(p.validUntil));
    setLines(proposalToLines(p));
  }, [proposalId]);

  useEffect(() => {
    void (async () => {
      try {
        await loadCatalog();
        if (!isNew) {
          await loadProposal();
        } else {
          const leadId = searchParams.get("leadId");
          const bookId = searchParams.get("bookingId");
          if (leadId) setPipelineLeadId(leadId);
          if (bookId) setBookingId(bookId);
        }
      } catch (e) {
        setFeedback({
          open: true,
          title: "Erro",
          message: e instanceof Error ? e.message : "Falha ao carregar dados.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [isNew, loadCatalog, loadProposal, searchParams]);

  useEffect(() => {
    if (!isNew || !pipelineLeadId) return;
    const lead = leads.find((l) => l.id === pipelineLeadId);
    if (lead) applyLeadPrefill(lead);
  }, [isNew, pipelineLeadId, leads, applyLeadPrefill]);

  const buildBody = () => ({
    title: title.trim(),
    pipelineLeadId: pipelineLeadId || undefined,
    bookingId: bookingId || undefined,
    contactName: contactName.trim(),
    contactEmail: contactEmail.trim(),
    contactPhone: contactPhone.trim() || undefined,
    companyName: companyName.trim() || undefined,
    eventType: eventType.trim() || undefined,
    eventDate: eventDate || undefined,
    guestCount: guestCount ? Number.parseInt(guestCount, 10) : undefined,
    discount: discount || "0",
    tax: tax || "0",
    notes: notes.trim() || undefined,
    terms: terms.trim() || undefined,
    validUntil: validUntil || undefined,
    items: itemsToPayload(lines),
  });

  const save = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const res = await api.post<VenueProposal>("/boston-city-hall/proposals", buildBody());
        router.replace(`${BCH_BASE}/propostas/${res.data.id}`);
        return;
      }
      const body = locked ? { status } : { ...buildBody(), status };
      const res = await api.patch<VenueProposal>(
        `/boston-city-hall/proposals/${proposalId}`,
        body,
      );
      setProposal(res.data);
      setStatus(res.data.status);
      setLines(proposalToLines(res.data));
      setFeedback({
        open: true,
        title: "Salvo",
        message: "Proposta atualizada.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    if (isNew || !proposal) return;
    setSaving(true);
    try {
      const res = await api.post<VenueProposal>(
        `/boston-city-hall/proposals/${proposalId}/duplicate`,
      );
      router.push(`${BCH_BASE}/propostas/${res.data.id}`);
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao duplicar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const generateContract = async () => {
    if (isNew || !proposal || proposal.status !== "accepted" || proposal.contractId) return;
    setSaving(true);
    try {
      const res = await api.post<{ id: string }>("/boston-city-hall/contracts", {
        proposalId: proposal.id,
      });
      router.push(`${BCH_BASE}/contratos/${res.data.id}`);
    } catch (e) {
      setFeedback({
        open: true,
        title: "Contrato",
        message: e instanceof Error ? e.message : "Não foi possível gerar o contrato.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    if (isNew || !proposal) return;
    try {
      const res = await authFetch(`/api/boston-city-hall/proposals/${proposalId}/pdf`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposta-${proposal.proposalNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setFeedback({
        open: true,
        title: "PDF",
        message: e instanceof Error ? e.message : "Não foi possível gerar o PDF.",
        variant: "error",
      });
    }
  };

  const addLine = (type: ItemLine["sourceType"]) => {
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        sourceType: type,
        sourceServiceId: "",
        sourcePackageId: "",
        name: "",
        description: "",
        quantity: "1",
        unitPrice: "",
      },
    ]);
  };

  const updateLine = (key: string, patch: Partial<ItemLine>) => {
    setLines((prev) =>
      prev.map((ln) => {
        if (ln.key !== key) return ln;
        const next = { ...ln, ...patch };
        if (patch.sourceServiceId) {
          const svc = services.find((s) => s.id === patch.sourceServiceId);
          if (svc) {
            next.unitPrice = svc.defaultPrice;
            next.name = svc.name;
          }
        }
        if (patch.sourcePackageId) {
          const pkg = packages.find((p) => p.id === patch.sourcePackageId);
          if (pkg) {
            next.unitPrice = pkg.defaultPrice;
            next.name = pkg.name;
          }
        }
        return next;
      }),
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" asChild className="w-fit">
          <Link href={`${BCH_BASE}/propostas`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {!isNew ? (
            <>
              {proposal?.status === "accepted" && proposal.contractId ? (
                <Button type="button" variant="secondary" asChild>
                  <Link href={`${BCH_BASE}/contratos/${proposal.contractId}`}>
                    <FileSignature className="mr-2 h-4 w-4" />
                    Abrir contrato
                    {proposal.contractNumber ? ` (${proposal.contractNumber})` : ""}
                  </Link>
                </Button>
              ) : null}
              {proposal?.status === "accepted" && !proposal.contractId ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void generateContract()}
                  disabled={saving}
                >
                  <FileSignature className="mr-2 h-4 w-4" />
                  Gerar contrato
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => void downloadPdf()}>
                <FileDown className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button type="button" variant="outline" onClick={() => void duplicate()} disabled={saving}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </Button>
            </>
          ) : null}
          <Button type="button" onClick={() => void save()} disabled={saving} className="min-h-[44px]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </div>
      </div>

      {!isNew && proposal ? (
        <p className="text-sm text-muted-foreground">
          {proposal.proposalNumber} · atualizado em{" "}
          {new Date(proposal.updatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </p>
      ) : null}

      {locked ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Proposta fora de rascunho: só é possível alterar o status ou duplicar para revisar valores.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="prop-title">Título / evento</Label>
            <Input
              id="prop-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-status">Status</Label>
            <NativeSelect
              id="prop-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {VENUE_PROPOSAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {VENUE_PROPOSAL_STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-valid">Validade</Label>
            <Input
              id="prop-valid"
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-lead">Lead (opcional)</Label>
            <NativeSelect
              id="prop-lead"
              value={pipelineLeadId}
              onChange={(e) => setPipelineLeadId(e.target.value)}
              disabled={locked}
            >
              <option value="">Nenhum</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.contactName}
                  {l.companyName ? ` — ${l.companyName}` : ""}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-booking">Reserva (opcional)</Label>
            <NativeSelect
              id="prop-booking"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              disabled={locked}
            >
              <option value="">Nenhuma</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} · {new Date(b.startAt).toLocaleDateString("pt-BR")}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-contact">Contato</Label>
            <Input
              id="prop-contact"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-email">E-mail</Label>
            <Input
              id="prop-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-phone">Telefone</Label>
            <Input
              id="prop-phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-company">Empresa</Label>
            <Input
              id="prop-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-type">Tipo de evento</Label>
            <Input
              id="prop-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-date">Data do evento</Label>
            <Input
              id="prop-date"
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-guests">Convidados</Label>
            <Input
              id="prop-guests"
              inputMode="numeric"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              disabled={locked}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Itens</CardTitle>
          {!locked ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => addLine("service")}>
                <Plus className="mr-1 h-4 w-4" />
                Serviço
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => addLine("package")}>
                <Plus className="mr-1 h-4 w-4" />
                Pacote
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => addLine("custom")}>
                <Plus className="mr-1 h-4 w-4" />
                Customizado
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item na proposta.</p>
          ) : (
            lines.map((ln) => (
              <div
                key={ln.key}
                className="rounded-lg border border-border p-3 space-y-3 sm:grid sm:grid-cols-12 sm:gap-3 sm:space-y-0"
              >
                {ln.sourceType === "service" ? (
                  <div className="space-y-1 sm:col-span-5">
                    <Label className="text-xs">Serviço</Label>
                    <NativeSelect
                      value={ln.sourceServiceId}
                      onChange={(e) => updateLine(ln.key, { sourceServiceId: e.target.value })}
                      disabled={locked}
                    >
                      <option value="">Selecione…</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                ) : null}
                {ln.sourceType === "package" ? (
                  <div className="space-y-1 sm:col-span-5">
                    <Label className="text-xs">Pacote</Label>
                    <NativeSelect
                      value={ln.sourcePackageId}
                      onChange={(e) => updateLine(ln.key, { sourcePackageId: e.target.value })}
                      disabled={locked}
                    >
                      <option value="">Selecione…</option>
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                ) : null}
                {ln.sourceType === "custom" ? (
                  <div className="space-y-1 sm:col-span-5">
                    <Label className="text-xs">Nome</Label>
                    <Input
                      value={ln.name}
                      onChange={(e) => updateLine(ln.key, { name: e.target.value })}
                      disabled={locked}
                    />
                  </div>
                ) : null}
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Qtd</Label>
                  <Input
                    value={ln.quantity}
                    onChange={(e) => updateLine(ln.key, { quantity: e.target.value })}
                    disabled={locked}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Unitário</Label>
                  <Input
                    value={ln.unitPrice}
                    onChange={(e) => updateLine(ln.key, { unitPrice: e.target.value })}
                    disabled={locked || ln.sourceType !== "custom"}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Total linha</Label>
                  <div className="flex min-h-[40px] items-center text-sm font-medium">
                    {formatCatalogMoney(lineTotal(ln.quantity, ln.unitPrice))}
                  </div>
                </div>
                {!locked ? (
                  <div className="flex items-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setLines((prev) => prev.filter((x) => x.key !== ln.key))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:max-w-md">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal (preview)</span>
            <span>{formatCatalogMoney(previewSubtotal)}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-discount">Desconto (R$)</Label>
            <Input
              id="prop-discount"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-tax">Taxas (R$)</Label>
            <Input
              id="prop-tax"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
            <span>Total (preview)</span>
            <span>{formatCatalogMoney(previewTotal)}</span>
          </div>
          {!isNew && proposal ? (
            <p className="text-xs text-muted-foreground">
              Total oficial (servidor): {formatCatalogMoney(proposal.total)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações e termos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="prop-notes">Observações</Label>
            <Textarea
              id="prop-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-terms">Termos</Label>
            <Textarea
              id="prop-terms"
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              disabled={locked}
            />
          </div>
        </CardContent>
      </Card>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}
