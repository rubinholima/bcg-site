"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileDown, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VenueContract } from "@/types/boston-city-hall";
import {
  formatCatalogMoney,
  formatProposalDate,
  parseProposalDateInput,
  VENUE_CONTRACT_STATUSES,
  VENUE_CONTRACT_STATUS_LABEL,
} from "@/types/boston-city-hall";
import { BCH_BASE } from "./boston-city-hall-lead-shared";

export function BostonCityHallContractDetail({ contractId }: { contractId: string }) {
  const [contract, setContract] = useState<VenueContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [confirmSigned, setConfirmSigned] = useState(false);

  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const locked = status !== "draft";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<VenueContract>(`/boston-city-hall/contracts/${contractId}`);
      const c = res.data;
      setContract(c);
      setStatus(c.status);
      setNotes(c.notes ?? "");
      setTerms(c.terms ?? "");
      setValidFrom(parseProposalDateInput(c.validFrom));
      setValidUntil(parseProposalDateInput(c.validUntil));
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Contrato não encontrado.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch?: { status?: string }) => {
    setSaving(true);
    try {
      const body = patch?.status
        ? { status: patch.status }
        : {
            status,
            notes: notes.trim() || null,
            terms: terms.trim() || null,
            validFrom: validFrom || null,
            validUntil: validUntil || null,
          };
      const res = await api.patch<VenueContract>(
        `/boston-city-hall/contracts/${contractId}`,
        body,
      );
      setContract(res.data);
      setStatus(res.data.status);
      setFeedback({
        open: true,
        title: "Salvo",
        message: "Contrato atualizado.",
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
      setConfirmSigned(false);
    }
  };

  const downloadPdf = async () => {
    if (!contract) return;
    try {
      const res = await authFetch(`/api/boston-city-hall/contracts/${contractId}/pdf`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contrato-${contract.contractNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setFeedback({
        open: true,
        title: "PDF",
        message: e instanceof Error ? e.message : "Falha ao gerar PDF.",
        variant: "error",
      });
    }
  };

  const onStatusChange = (next: string) => {
    if (next === "signed" && status !== "signed") {
      setConfirmSigned(true);
      return;
    }
    setStatus(next);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contract) {
    return <p className="text-sm text-muted-foreground">Contrato indisponível.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" asChild className="w-fit">
          <Link href={`${BCH_BASE}/contratos`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void downloadPdf()}>
            <FileDown className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving} className="min-h-[44px]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {contract.contractNumber} · Proposta{" "}
        <Link href={`${BCH_BASE}/propostas/${contract.proposalId}`} className="text-violet-300 hover:underline">
          {contract.proposalNumber}
        </Link>
      </p>

      {locked ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Comercial congelado. Altere apenas o status ou baixe o PDF.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <span className="text-muted-foreground">Cliente</span>
            <p className="font-medium">{contract.contactName}</p>
            {contract.companyName ? <p className="text-muted-foreground">{contract.companyName}</p> : null}
          </div>
          <div>
            <span className="text-muted-foreground">Contato</span>
            <p>{contract.contactEmail}</p>
            {contract.contactPhone ? <p>{contract.contactPhone}</p> : null}
          </div>
          <div>
            <span className="text-muted-foreground">Evento</span>
            <p className="font-medium">{contract.title}</p>
            <p className="text-muted-foreground">{formatProposalDate(contract.eventDate)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-status">Status</Label>
            <NativeSelect id="c-status" value={status} onChange={(e) => onStatusChange(e.target.value)}>
              {VENUE_CONTRACT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {VENUE_CONTRACT_STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </NativeSelect>
          </div>
          {!locked ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="c-from">Vigência início</Label>
                <Input
                  id="c-from"
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-until">Vigência fim</Label>
                <Input
                  id="c-until"
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div>
              <span className="text-muted-foreground">Vigência</span>
              <p>
                {formatProposalDate(contract.validFrom)} — {formatProposalDate(contract.validUntil)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Enviado: {formatProposalDate(contract.sentAt)} · Assinado:{" "}
                {formatProposalDate(contract.signedAt)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Unitário</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contract.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.name}</TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
                  <TableCell className="text-right">{formatCatalogMoney(it.unitPrice)}</TableCell>
                  <TableCell className="text-right">{formatCatalogMoney(it.totalPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 sm:max-w-sm text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCatalogMoney(contract.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Desconto</span>
            <span>{formatCatalogMoney(contract.discount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxas</span>
            <span>{formatCatalogMoney(contract.tax)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatCatalogMoney(contract.total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Termos e observações</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="c-terms">Termos</Label>
            <Textarea
              id="c-terms"
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-notes">Observações</Label>
            <Textarea
              id="c-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={locked}
            />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmSigned} onOpenChange={setConfirmSigned}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como assinado?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme apenas se o contrato foi assinado pelo cliente. Esta ação congela o acordo comercial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void save({ status: "signed" })}>
              Confirmar assinatura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
