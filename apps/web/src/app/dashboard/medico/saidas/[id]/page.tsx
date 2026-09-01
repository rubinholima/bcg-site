"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Pencil,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { FeedbackModal } from "@/components/ui/feedback-modal";
import type { MedicalDeparture } from "@/types/medical-departure";
import {
  MEDICAL_DEPARTURE_CARE_TYPE_LABEL,
  MEDICAL_DEPARTURE_STATUS_LABEL,
  MEDICAL_DEPARTURE_TRANSPORT_LABEL,
  formatMedicalDepartureDateTime,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "@/lib/medical-departure-labels";
import { getPublicImageUrl } from "@/lib/media-url";
import { getCategoryLabel } from "@/lib/fixture-categories";

export default function SaidaMedicaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [row, setRow] = useState<MedicalDeparture | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnedAt, setReturnedAt] = useState(() => toDateTimeLocalValue(new Date().toISOString()));
  const [returnSummary, setReturnSummary] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get<MedicalDeparture>(`/medical-departures/${id}`);
      setRow(data);
      setReturnSummary(data.careSummary ?? "");
      setReturnNotes(data.notes ?? "");
      if (data.returnedAt) setReturnedAt(toDateTimeLocalValue(data.returnedAt));
    } catch {
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) {
      router.replace("/403");
      return;
    }
    void load();
  }, [authLoading, canAccessModule, load, router]);

  const registerReturn = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const iso = fromDateTimeLocalValue(returnedAt);
      await api.post(`/medical-departures/${id}/return`, {
        returnedAt: iso,
        careSummary: returnSummary.trim() || undefined,
        notes: returnNotes.trim() || undefined,
      });
      setReturnOpen(false);
      await load();
      setFeedback({ open: true, title: "Retorno registrado", message: "Atleta marcado como retornou ao CT." });
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível registrar o retorno." });
    } finally {
      setSaving(false);
    }
  };

  const cancelDeparture = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await api.post(`/medical-departures/${id}/cancel`);
      setCancelOpen(false);
      await load();
      setFeedback({ open: true, title: "Saída cancelada", message: "Registro cancelado com sucesso." });
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível cancelar a saída." });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="space-y-3 p-6">
        <p>Saída não encontrada.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/medico/saidas">Voltar</Link>
        </Button>
      </div>
    );
  }

  const canReturn = row.status === "programada" || row.status === "em_atendimento";
  const canCancel = canReturn;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/dashboard/medico/saidas"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Saídas do CT
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{row.player?.name}</h1>
            <p className="text-muted-foreground">
              {MEDICAL_DEPARTURE_CARE_TYPE_LABEL[row.careType]}
              {row.category ? ` · ${getCategoryLabel(row.category, "pt")}` : ""}
              {row.tenant?.name ? ` · ${row.tenant.name}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="min-h-[44px]">
              <Link href={`/dashboard/medico/saidas/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
            {canCancel ? (
              <Button variant="outline" className="min-h-[44px]" onClick={() => setCancelOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            ) : null}
            {canReturn ? (
              <Button
                className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setReturnOpen(true)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Registrar retorno
              </Button>
            ) : (
              <span className="inline-flex min-h-[44px] items-center rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">
                {MEDICAL_DEPARTURE_STATUS_LABEL[row.status]}
              </span>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Registro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Status:</span> {MEDICAL_DEPARTURE_STATUS_LABEL[row.status]}</p>
          <p><span className="text-muted-foreground">Saída:</span> {formatMedicalDepartureDateTime(row.departedAt)}</p>
          <p><span className="text-muted-foreground">Retorno:</span> {formatMedicalDepartureDateTime(row.returnedAt)}</p>
          <p><span className="text-muted-foreground">Destino:</span> {row.destination}</p>
          <p><span className="text-muted-foreground">Motivo:</span> {row.reason}</p>
          <p><span className="text-muted-foreground">Resumo / resolvido:</span> {row.careSummary ?? "—"}</p>
          <p><span className="text-muted-foreground">Transporte:</span> {MEDICAL_DEPARTURE_TRANSPORT_LABEL[row.transportMode]}{row.transportNotes ? ` — ${row.transportNotes}` : ""}</p>
          <p><span className="text-muted-foreground">Acompanhante:</span> {row.companionName ?? "—"}{row.companionPhone ? ` · ${row.companionPhone}` : ""}</p>
          <p><span className="text-muted-foreground">Observações:</span> {row.notes ?? "—"}</p>
          {(row.documents?.length ?? 0) > 0 ? (
            <div>
              <p className="text-muted-foreground">Documentos:</p>
              <ul className="mt-1 space-y-1">
                {row.documents!.map((d) => (
                  <li key={d.id}>
                    <a href={getPublicImageUrl(d.fileUrl)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {d.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {row.playerId ? (
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href={`/dashboard/cadastros/jogadores/${row.playerId}/edit?tab=saidas_medicas`}>
                Abrir ficha do atleta
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar retorno ao CT</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Data/hora do retorno</Label>
              <Input
                type="datetime-local"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={returnedAt}
                onChange={(e) => setReturnedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>O que foi resolvido</Label>
              <Textarea value={returnSummary} onChange={(e) => setReturnSummary(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)} disabled={saving}>Fechar</Button>
            <Button onClick={() => void registerReturn()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar retorno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar saída?</AlertDialogTitle>
            <AlertDialogDescription>
              A saída de <strong>{row.player?.name}</strong> será marcada como cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={(e) => { e.preventDefault(); void cancelDeparture(); }}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancelar saída
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
