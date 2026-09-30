"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
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
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { STAFF_ROLES } from "@/lib/staff-roles";
import {
  TRYOUT_DOCUMENT_TYPE_OPTIONS,
  type TryoutCoachOption,
  type TryoutDossier,
  labelTryoutCoachOutcome,
  labelTryoutDocumentType,
  labelTryoutStage,
} from "@/lib/tryout-workflow-types";

function staffRoleLabel(role: string): string {
  return STAFF_ROLES.find((r) => r.value === role)?.label ?? role;
}

function isMinorBirthDate(birthDate?: string | null): boolean {
  if (!birthDate?.trim()) return true;
  const d = new Date(birthDate.length <= 10 ? `${birthDate}T12:00:00` : birthDate);
  if (Number.isNaN(d.getTime())) return true;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age < 18;
}

type Props = {
  prospectId: string;
  tenantId: string;
  onUpdated?: () => void;
};

export function TryoutProspectWorkflowPanel({ prospectId, tenantId, onUpdated }: Props) {
  const [dossier, setDossier] = useState<TryoutDossier | null>(null);
  const [coaches, setCoaches] = useState<TryoutCoachOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadType, setUploadType] = useState("identidade");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmWeek, setConfirmWeek] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [coachForm, setCoachForm] = useState({
    staffId: "",
    technicalRating: "3",
    physicalRating: "3",
    tacticalRating: "3",
    cognitiveRating: "3",
    descriptiveObservation: "",
    justification: "",
    outcome: "aprovado" as "aprovado" | "reprovado" | "mais_uma_semana",
  });
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const load = useCallback(async () => {
    if (!prospectId) return;
    setLoading(true);
    try {
      const { data } = await api.get<TryoutDossier>(`/tryout-workflow/prospects/${prospectId}/dossier`);
      setDossier(data);
      const cat = data.prospect.targetCategory ?? "";
      const { data: coachRows } = await api.get<TryoutCoachOption[]>(
        `/tryout-workflow/coaches?tenantId=${encodeURIComponent(tenantId)}&category=${encodeURIComponent(cat)}`,
      );
      setCoaches(coachRows);
      const defaultCoach =
        data.prospect.responsibleCoachStaffId ??
        coachRows.find((c) => c.matchesCategory)?.id ??
        coachRows[0]?.id ??
        "";
      setCoachForm((f) => ({ ...f, staffId: f.staffId || defaultCoach }));
    } catch {
      setDossier(null);
    } finally {
      setLoading(false);
    }
  }, [prospectId, tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const minor = isMinorBirthDate(dossier?.prospect.birthDate);
  const requiredDocs = useMemo(() => {
    const base = [{ type: "identidade", label: "Documento de identificação" }];
    if (minor) {
      base.push({ type: "autorizacao_responsavel", label: "Documento / autorização do responsável" });
    }
    return base;
  }, [minor]);

  const receivedTypes = useMemo(() => {
    return new Set((dossier?.documents ?? []).map((d) => d.documentType));
  }, [dossier?.documents]);

  const cycleNumber = dossier?.prospect.tryoutCycleNumber ?? 0;
  const displayWeek = cycleNumber > 0 ? cycleNumber : 1;
  const stage = dossier?.prospect.tryoutWorkflowStage;
  const canEvaluateWeek =
    stage === "em_avaliacao_campo" || stage === "aguardando_treinador";

  async function uploadDocument() {
    if (!pendingFile) {
      setFeedback({
        open: true,
        title: "Arquivo",
        message: "Selecione um PDF ou imagem.",
        variant: "warning",
      });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", pendingFile);
      fd.append("documentType", uploadType);
      await api.postForm(`/tryout-workflow/prospects/${prospectId}/documents`, fd);
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
      onUpdated?.();
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível enviar o documento.",
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  }

  async function downloadDoc(documentId: string) {
    const url = `/api/tryout-workflow/prospects/${prospectId}/documents/${documentId}/download`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function removeDoc(documentId: string) {
    try {
      await api.delete(`/tryout-workflow/prospects/${prospectId}/documents/${documentId}`);
      setDeleteDocId(null);
      await load();
      onUpdated?.();
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível remover o documento.",
        variant: "error",
      });
    }
  }

  async function submitCoachEvaluation() {
    if (!coachForm.justification.trim() || !coachForm.descriptiveObservation.trim()) {
      setFeedback({
        open: true,
        title: "Campos obrigatórios",
        message: "Preencha observação descritiva e justificativa.",
        variant: "warning",
      });
      return;
    }
    if (!coachForm.staffId) {
      setFeedback({
        open: true,
        title: "Treinador",
        message: "Selecione o treinador responsável.",
        variant: "warning",
      });
      return;
    }
    if (coachForm.outcome === "mais_uma_semana") {
      setConfirmWeek(true);
      return;
    }
    await postCoachEvaluation();
  }

  async function postCoachEvaluation() {
    try {
      await api.post(`/tryout-workflow/prospects/${prospectId}/coach-evaluation`, {
        staffId: coachForm.staffId,
        technicalRating: Number(coachForm.technicalRating),
        physicalRating: Number(coachForm.physicalRating),
        tacticalRating: Number(coachForm.tacticalRating),
        cognitiveRating: Number(coachForm.cognitiveRating),
        descriptiveObservation: coachForm.descriptiveObservation.trim(),
        justification: coachForm.justification.trim(),
        outcome: coachForm.outcome,
      });
      setConfirmWeek(false);
      setCoachForm((f) => ({ ...f, justification: "", descriptiveObservation: "" }));
      await load();
      onUpdated?.();
      setFeedback({
        open: true,
        title: "Avaliação registrada",
        message: "Decisão semanal salva.",
        variant: "success",
      });
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível registrar a avaliação.",
        variant: "error",
      });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dossier) {
    return <p className="text-sm text-muted-foreground">Não foi possível carregar o fluxo Try Out.</p>;
  }

  const blocking = dossier.documentBlocking;
  const selectedCoach = coaches.find((c) => c.id === coachForm.staffId);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/70 bg-zinc-950/50 p-3 text-sm">
        <div className="font-medium">{dossier.prospect.name}</div>
        <div className="text-muted-foreground">
          {labelTryoutStage(stage)} · {dossier.prospect.targetCategory ?? "—"}
        </div>
        {canEvaluateWeek ? (
          <div className="mt-1 text-amber-200/90">Semana {displayWeek}</div>
        ) : null}
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Documentos</h3>
        {!blocking.satisfied ? (
          <p className="text-sm text-amber-300/90">
            Aguardando documentos — avaliação em campo bloqueada até concluir a documentação obrigatória.
          </p>
        ) : (
          <p className="text-sm text-emerald-300/90">Documentação obrigatória recebida.</p>
        )}
        <ul className="space-y-1 text-sm">
          {requiredDocs.map((req) => {
            const ok = receivedTypes.has(req.type);
            return (
              <li key={req.type} className={ok ? "text-emerald-300/90" : "text-amber-300/90"}>
                {ok ? "✓" : "○"} {req.label}
              </li>
            );
          })}
        </ul>
        {(dossier.documents ?? []).length > 0 ? (
          <div className="overflow-x-auto rounded border border-border/60">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground">
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Arquivo</th>
                  <th className="p-2">Enviado</th>
                  <th className="p-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dossier.documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-border/40">
                    <td className="p-2">{labelTryoutDocumentType(doc.documentType)}</td>
                    <td className="p-2">{doc.originalFilename}</td>
                    <td className="p-2">{formatDateDayMonYear(new Date(doc.uploadedAt))}</td>
                    <td className="p-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => void downloadDoc(doc.id)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-red-300"
                        onClick={() => setDeleteDocId(doc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum documento enviado.</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>Tipo</Label>
            <NativeSelectField
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              options={TRYOUT_DOCUMENT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
          <div>
            <Label>Arquivo</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
              className="text-foreground file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <Button type="button" disabled={uploading} onClick={() => void uploadDocument()}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Enviar documento
        </Button>
      </section>

      <section className="space-y-2 text-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Fisioterapia</h3>
        <p>
          Status operacional:{" "}
          <span className="text-foreground">
            {dossier.physioOperational.status === "aprovado"
              ? "Liberado"
              : dossier.physioOperational.status === "temporario_nao_liberado"
                ? "Não liberado — aguardando reavaliação"
                : dossier.physioOperational.status === "reprovado"
                  ? "Não liberado (encerramento)"
                  : "Pendente"}
          </span>
        </p>
      </section>

      {canEvaluateWeek ? (
        <section className="space-y-3 rounded-lg border border-violet-500/25 p-3">
          <h3 className="text-sm font-semibold">Avaliação semanal — Semana {displayWeek}</h3>
          <div>
            <Label>Treinador responsável</Label>
            <NativeSelectField
              value={coachForm.staffId}
              onChange={(e) => setCoachForm((f) => ({ ...f, staffId: e.target.value }))}
              placeholder="Selecione o treinador…"
              options={coaches.map((c) => ({
                value: c.id,
                label: `${c.name} · ${staffRoleLabel(c.role)}${c.matchesCategory ? " · categoria" : ""}`,
              }))}
            />
            {selectedCoach ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedCoach.name} — {staffRoleLabel(selectedCoach.role)}
                {selectedCoach.categories.length
                  ? ` · ${selectedCoach.categories.join(", ")}`
                  : " · todas as categorias"}
              </p>
            ) : null}
          </div>
          {(["technicalRating", "physicalRating", "tacticalRating", "cognitiveRating"] as const).map((key) => (
            <div key={key}>
              <Label>
                {key === "technicalRating"
                  ? "Técnico (0–5)"
                  : key === "physicalRating"
                    ? "Físico (0–5)"
                    : key === "tacticalRating"
                      ? "Tático (0–5)"
                      : "Cognitivo (0–5)"}
              </Label>
              <Input
                type="number"
                min={0}
                max={5}
                step={0.5}
                className="text-foreground"
                value={coachForm[key]}
                onChange={(e) => setCoachForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <Label>Observação descritiva *</Label>
            <Textarea
              className="text-foreground"
              value={coachForm.descriptiveObservation}
              onChange={(e) => setCoachForm((f) => ({ ...f, descriptiveObservation: e.target.value }))}
            />
          </div>
          <div>
            <Label>Decisão *</Label>
            <NativeSelect
              value={coachForm.outcome}
              onChange={(e) =>
                setCoachForm((f) => ({
                  ...f,
                  outcome: e.target.value as "aprovado" | "reprovado" | "mais_uma_semana",
                }))
              }
            >
              <option value="aprovado">Aprovado</option>
              <option value="reprovado">Reprovado</option>
              <option value="mais_uma_semana">Mais uma semana</option>
            </NativeSelect>
          </div>
          <div>
            <Label>Justificativa *</Label>
            <Textarea
              className="text-foreground"
              value={coachForm.justification}
              onChange={(e) => setCoachForm((f) => ({ ...f, justification: e.target.value }))}
            />
          </div>
          <Button type="button" onClick={() => void submitCoachEvaluation()}>
            Registrar decisão da semana {displayWeek}
          </Button>
        </section>
      ) : null}

      {(dossier.weeklyEvaluations ?? []).length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Histórico de avaliações
          </h3>
          <div className="space-y-2">
            {dossier.weeklyEvaluations.map((ev) => (
              <div key={ev.id} className="rounded border border-border/60 bg-zinc-950/40 p-3 text-xs">
                <div className="font-medium">
                  Semana {ev.cycleNumber} — {labelTryoutCoachOutcome(ev.outcome)}
                </div>
                <div className="text-muted-foreground">
                  Treinador: {ev.staffName ?? "—"} · {formatDateDayMonYear(new Date(ev.evaluatedAt))}
                </div>
                <div className="mt-1 text-muted-foreground">
                  Notas T/F/Tá/C: {ev.technicalRating}/{ev.physicalRating}/{ev.tacticalRating}/
                  {ev.cognitiveRating}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-foreground/90">{ev.descriptiveObservation}</p>
                {ev.justification ? (
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    Justificativa: {ev.justification}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <AlertDialog open={confirmWeek} onOpenChange={setConfirmWeek}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mais uma semana</AlertDialogTitle>
            <AlertDialogDescription>
              A avaliação da semana {displayWeek} será registrada e um novo ciclo de 7 dias será iniciado. O
              candidato permanece em avaliação em campo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void postCoachEvaluation()}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDocId} onOpenChange={(o) => !o && setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo deixa de valer para o fluxo. Você pode enviar outro em seguida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDocId && void removeDoc(deleteDocId)}>
              Remover
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
