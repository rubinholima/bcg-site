"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NursingSession } from "@/types/enfermaria";
import { FeedbackModal } from "@/components/ui/feedback-modal";
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
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPublicImageUrl } from "@/lib/media-url";
import { formatNursingExemptFromTraining } from "@/lib/enfermaria-labels";

const ATTACHMENT_KIND_LABEL: Record<string, string> = {
  exame: "Exame",
  pedido: "Pedido",
  outro: "Anexo",
};

export default function EnfermariaSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [session, setSession] = useState<NursingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get<NursingSession>(`/enfermaria/sessions/${id}`);
      setSession(data);
    } catch {
      setSession(null);
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

  const completeSession = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await api.post(`/enfermaria/sessions/${id}/complete`);
      await load();
      setFeedback({ open: true, title: "Alta registrada", message: "Atendimento encerrado com sucesso." });
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível registrar a alta." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await api.delete(`/enfermaria/sessions/${id}`);
      router.push("/dashboard/saude/enfermaria");
    } catch {
      setDeleteOpen(false);
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível excluir o atendimento. Tente novamente.",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-3 p-6">
        <p>Atendimento não encontrado.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/saude/enfermaria">Voltar</Link>
        </Button>
      </div>
    );
  }

  const diagnosisLines = (session.sessionDiagnoses ?? [])
    .map((d) => d.diagnosisLabel ?? d.diagnosis?.name)
    .filter(Boolean);

  const treatmentLines = (session.sessionTreatments ?? []).map((t) => {
    const name = t.treatmentLabel ?? t.treatment?.name ?? "Tratamento";
    const qty =
      t.quantityUsed != null
        ? ` (${t.quantityUsed}${t.product?.unit ? ` ${t.product.unit}` : ""})`
        : "";
    const stock = t.stockMovementId ? " · baixa no estoque" : "";
    return `${name}${qty}${stock}`;
  });

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/dashboard/saude/enfermaria"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Enfermaria
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{session.player?.name}</h1>
            <p className="text-muted-foreground">
              {formatDateDayMonYear(session.attendedAt)}
              {session.tenant?.name ? ` · ${session.tenant.name}` : ""}
              {session.category ? ` · ${session.category}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="min-h-[44px]">
              <Link href={`/dashboard/saude/enfermaria/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px] text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
            {session.status === "completed" ? (
              <span className="inline-flex min-h-[44px] items-center rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">
                Alta
              </span>
            ) : session.status === "cancelled" ? (
              <span className="inline-flex min-h-[44px] items-center rounded-full bg-zinc-600 px-3 py-1 text-sm font-semibold text-white">
                Cancelado
              </span>
            ) : (
              <Button
                className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
                disabled={saving}
                onClick={() => void completeSession()}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Registrar alta
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Registro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Enfermeiro:</span> {session.nurseName ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Sintomas:</span> {session.symptoms ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Diagnóstico(s):</span>{" "}
            {diagnosisLines.length ? diagnosisLines.join(" · ") : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Medicamentos / tratamentos:</span>{" "}
            {treatmentLines.length ? treatmentLines.join(" · ") : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Notas:</span> {session.treatmentNotes ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Tempo de tratamento:</span>{" "}
            {session.estimatedEndDate
              ? formatDateDayMonYear(session.estimatedEndDate)
              : session.estimatedDays
                ? `${session.estimatedDays} dias`
                : "—"}
          </p>
          {session.status === "active" ? (
            <p>
              <span className="text-muted-foreground">Treino:</span>{" "}
              {formatNursingExemptFromTraining(session.exemptFromTraining)}
            </p>
          ) : null}
          {session.attachments && session.attachments.length > 0 ? (
            <div>
              <p className="text-muted-foreground">Anexos:</p>
              <ul className="mt-1 space-y-1">
                {session.attachments.map((a, i) => (
                  <li key={`${a.fileUrl}-${i}`}>
                    <a
                      href={getPublicImageUrl(a.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {ATTACHMENT_KIND_LABEL[a.kind ?? "outro"] ?? "Anexo"} — {a.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {session.playerId ? (
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href={`/dashboard/cadastros/jogadores/${session.playerId}/edit?tab=enfermaria`}>
                Abrir ficha do atleta
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro de enfermaria de{" "}
              <strong>{session.player?.name}</strong> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
